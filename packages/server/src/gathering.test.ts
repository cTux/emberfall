import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player, ResourceState, WorldState } from '@emberfall/common';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';
import {
  VILLAGE_RESOURCES,
  resourceNodes,
  gatherResource,
  restoreResources,
  RESOURCE_RESTORE_MS,
  GATHER_INTERVAL_MS,
  GATHER_RANGE,
  addItem,
  backpackSchema,
  useBackpackItem,
  transferStoredItem,
  freshStorages,
  createGame,
  baseMod,
  clientMessage,
  FOREST,
  PLANT_KINDS,
} from '@emberfall/core';
import { freshProgress, decodeProgress } from './characters.ts';

const hero = (node = VILLAGE_RESOURCES[0]): Player => ({
  ...freshProgress('warrior'),
  id: crypto.randomUUID(),
  name: 'Gatherer',
  classId: 'warrior',
  x: node.x,
  y: node.y - 15,
  color: 0,
  backpack: [],
});
const item = (itemId: string, quantity = 1) => ({ id: crypto.randomUUID(), itemId, quantity });

test('each tree allows five independent rolls, shows remaining health and restores after one hour', () => {
  const node = VILLAGE_RESOURCES.find((n) => n.kind === 'tree')!;
  const player = hero(node);
  const states: Record<string, ResourceState> = {};
  for (let i = 0; i < 5; i++) {
    const rolls = [0.79999, 0.39999, 0.19999];
    assert.deepEqual(
      gatherResource(player, states, node.id, 1000 + i * 400, () => rolls.shift()!),
      ['log', 'stick', 'leaf'],
    );
    assert.equal(states[node.id].remaining, 4 - i);
  }
  assert.deepEqual(
    player.backpack!.map((i) => i.quantity),
    [5, 5, 5],
  );
  assert.throws(() => gatherResource(player, states, node.id, 4000), /restoring/);
  const deadline = 2600 + RESOURCE_RESTORE_MS;
  restoreResources(states, deadline - 1);
  assert.equal(states[node.id].remaining, 0);
  restoreResources(states, deadline);
  assert.equal(states[node.id], undefined);
  const rolls = [0.8, 0.4, 0.2];
  assert.deepEqual(
    gatherResource(player, states, node.id, deadline, () => rolls.shift()!),
    [],
  );
  assert.equal(states[node.id].remaining, 4);
  restoreResources(states, deadline + RESOURCE_RESTORE_MS);
  assert.equal(states[node.id], undefined, 'abandoned partial trees restore too');
});

test('plants, rocks and stones grant one matching item and depletion is shared across players', () => {
  const nodes = [
    ...PLANT_KINDS.map((_, variant) =>
      VILLAGE_RESOURCES.find((n) => n.kind === 'plant' && n.variant === variant)!,
    ),
    ...(['rock', 'stone'] as const).map((kind) => VILLAGE_RESOURCES.find((n) => n.kind === kind)!),
  ];
  for (const node of nodes) {
    const states: Record<string, ResourceState> = {};
    const player = hero(node);
    assert.deepEqual(gatherResource(player, states, node.id, 1000), [
      node.kind === 'plant' ? PLANT_KINDS[node.variant!] : node.kind,
    ]);
    assert.equal(player.backpack![0].quantity, 1);
    assert.deepEqual(decodeProgress(JSON.stringify(player)).progress.backpack, player.backpack);
    assert.throws(() => gatherResource(hero(node), states, node.id, 1000), /restoring/);
    gatherResource(player, states, node.id, 1000 + RESOURCE_RESTORE_MS);
    assert.equal(player.backpack![0].quantity, 2);
  }
});

test('gathering rejects dead, distant, forged and rapid requests without mutation; wrapped forest nodes work', () => {
  const node = VILLAGE_RESOURCES[0];
  const player = hero(node);
  const states: Record<string, ResourceState> = {};
  assert.throws(() => gatherResource(player, states, 'forged', 1000), /closer/);
  player.hitpoints = 0;
  assert.throws(() => gatherResource(player, states, node.id, 1000), /dead/);
  player.hitpoints = 100;
  player.x += GATHER_RANGE + 1;
  assert.throws(() => gatherResource(player, states, node.id, 1000), /closer/);
  assert.deepEqual(states, {});
  Object.assign(player, { x: 1, y: 1, scene: 'forest' });
  const tree = resourceNodes(player, 250).find((n) => n.kind === 'tree')!;
  Object.assign(player, { x: tree.x + FOREST.width, y: tree.y - 15 + FOREST.height });
  gatherResource(player, states, tree.id, 1000, () => 0);
  assert.throws(
    () => gatherResource(player, states, tree.id, 1000 + GATHER_INTERVAL_MS - 1),
    /Wait/,
  );
  gatherResource(player, states, tree.id, 1000 + GATHER_INTERVAL_MS, () => 0);
  assert.equal(states[tree.id].remaining, 3);
  assert(clientMessage.safeParse({ type: 'gather', nodeId: tree.id, epoch: 'area' }).success);
  assert(!clientMessage.safeParse({ type: 'gather', nodeId: tree.id }).success);
});

test('resource stacks split at 200, fill partial stacks and reject overflow atomically; gear stays separate', () => {
  const backpack = [item('log', 199)];
  addItem(backpack, item('log', 402));
  assert.deepEqual(
    backpack.map((i) => i.quantity),
    [200, 200, 200, 1],
  );
  assert.equal(new Set(backpack.map((i) => i.id)).size, 4);
  assert(backpackSchema.safeParse(backpack).success);
  assert(!backpackSchema.safeParse([item('log', 201)]).success);
  const before = structuredClone(backpack);
  assert.throws(() => addItem(backpack, item('log', 200), 4), /full/);
  assert.deepEqual(backpack, before);
  addItem(backpack, item('warrior-sword'));
  addItem(backpack, item('warrior-sword'));
  assert.equal(backpack.filter((i) => i.itemId === 'warrior-sword').length, 2);
  assert.throws(() => addItem(backpack, item('warrior-sword', 2)), /quantity/);
  assert(!backpackSchema.safeParse([item('warrior-sword', 2)]).success);
});

test('a full backpack cannot partly award a multi-drop tree; storage, saves and protocol retain resource state', () => {
  const node = VILLAGE_RESOURCES[0];
  const player = hero(node);
  player.backpack = [item('log', 199), ...Array.from({ length: 19 }, () => item('warrior-sword'))];
  const before = structuredClone(player.backpack);
  const states: Record<string, ResourceState> = {};
  assert.throws(() => gatherResource(player, states, node.id, 1000, () => 0), /full/);
  assert.deepEqual(player.backpack, before);
  assert.deepEqual(states, {});
  // A single matching drop can fill a partial stack even with every slot occupied.
  const rolls = [0, 1, 1];
  gatherResource(player, states, node.id, 1000, () => rolls.shift()!);
  assert.equal(player.backpack[0].quantity, 200);
  assert.throws(() => useBackpackItem(player, player.backpack![0].id), /cannot equip/);
  player.storages = freshStorages();
  player.storages[0].items = [item('log', 199)];
  transferStoredItem(player, 0, player.backpack[0].id, true);
  assert.deepEqual(
    player.storages[0].items.map((i) => i.quantity),
    [200, 199],
  );
  assert.deepEqual(decodeProgress(JSON.stringify(player)).progress.backpack, player.backpack);
  const world: WorldState = {
    id: 'w',
    hostId: player.id,
    name: 'World',
    players: [player],
    resources: states,
  };
  const session = new SessionState();
  projectState(session, world);
  assert.deepEqual(materializeState(session)?.resources, states);
});

test('resource definitions work in isolated catalogs and validate saved stack limits', () => {
  const context = createGame([
    baseMod,
    {
      id: 'ore',
      register(r) {
        r.items.register({ id: 'ore', name: 'Ore', kind: 'resource' });
      },
    },
  ]);
  const backpack = [item('ore', 200)];
  context.rules.addItem(backpack, item('ore', 1));
  assert.deepEqual(
    backpack.map((i) => i.quantity),
    [200, 1],
  );
  assert(context.rules.backpackSchema.safeParse(backpack).success);
  assert(!context.rules.backpackSchema.safeParse([item('ore', 201)]).success);
});

test('session gathering validates the area epoch and owns rewards independently of wire fields', async () => {
  const { createRuntime } = await import('./runtime.ts');
  const { Peer } = await import('./network/peer.ts');
  const runtime = await createRuntime();
  const peer = new Peer(
    () => {},
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Gatherer', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    const player = [...world.players.values()][0];
    assert(player);
    const rock = VILLAGE_RESOURCES.find((n) => n.kind === 'rock')!;
    Object.assign(player, { x: rock.x, y: rock.y - 15 });
    peer.receive({ type: 'gather', nodeId: rock.id, epoch: 'old-forest' });
    assert.equal(world.resources?.[rock.id], undefined);
    peer.receive({ type: 'gather', nodeId: rock.id, epoch: 'lobby', quantity: 200, itemId: 'log' });
    assert.equal(world.resources?.[rock.id].remaining, 0);
    assert.deepEqual(
      player.backpack!.map(({ itemId, quantity }) => ({ itemId, quantity })),
      [{ itemId: 'rock', quantity: 1 }],
    );
    peer.receive({ type: 'gather', nodeId: rock.id, epoch: 'lobby' });
    assert.equal(player.backpack![0].quantity, 1);
  } finally {
    await runtime.close();
  }
});
