import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ResourceState, WorldState } from '@emberfall/common';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';
import {
  VILLAGE_RESOURCES,
  gatherResource,
  addItem,
  backpackSchema,
  useBackpackItem,
  transferStoredItem,
  freshStorages,
  createGame,
  baseMod,
} from '@emberfall/core';
import { decodeProgress } from './characters.ts';
import { hero, item } from './gathering.fixture.ts';

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
