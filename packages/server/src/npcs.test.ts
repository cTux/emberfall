import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '@emberfall/common';
import { nearbyInteraction, ARENA } from '@emberfall/core';
import { VillageLife, type NpcWorld } from './npcs.ts';
import type { NpcDialogue, DialogueResult } from './npc-models.ts';
import { createPlayers, simulationFor } from './ecs/simulation.ts';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';
import { SnapshotBuffer } from '../../client/src/snapshots.ts';
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const player = (id = 'p', x = 300, y = 250) => ({ id, name: id, x, y, hitpoints: 100 }) as Player;
function setup(
  dialogue: NpcDialogue = { generate: async () => ({ status: 'ok', text: 'Good morning!' }) },
) {
  const world: NpcWorld = { players: createPlayers() };
  world.players.set('p', player());
  const life = new VillageLife(world, dialogue, 0);
  return { world, life };
}

test('four residents walk, pause near players, and release authoritative ECS entities', () => {
  const { world, life } = setup();
  assert.deepEqual(
    world.npcs!.map((n) => n.buildingId),
    ['inn', 'hall', 'workshop', 'lodge'],
  );
  assert.equal(simulationFor(world.players)!.villagers.size, 4);
  const marta = world.npcs![0],
    initial = { x: marta.x, y: marta.y };
  life.tick(9000, 0.05);
  assert.equal(marta.moving, false);
  world.players.get('p')!.x = 1000;
  life.tick(9050, 0.05);
  assert(marta.moving);
  assert(Math.hypot(marta.x - initial.x, marta.y - initial.y) <= 38 * 0.05 + 0.001);
  assert.notEqual(marta.y, initial.y);
  world.players.clear();
  life.tick(9100, 0.05);
  assert.equal(marta.moving, false);
  life.close();
  assert.equal(simulationFor(world.players)!.villagers.size, 0);
});

test('automatic greetings are bounded across multiple players and explicit replies still work', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;
      return { status: 'ok', text: 'Hello!' };
    },
  });
  world.players.set('q', player('q'));
  life.tick(10_000, 0);
  await flush();
  assert.equal(calls, 1);
  assert.equal(world.chat![0].dimension, 'village');
  assert.equal(world.chat![0].npcId, 'innkeeper');
  for (let time = 10_050; time < 45_000; time += 50) life.tick(time, 0);
  assert.equal(calls, 1);
  life.hear(world.players.get('p')!, '@Marta How are you?', 45_000);
  life.tick(45_000, 0);
  await flush();
  assert.equal(calls, 2);
  life.close();
});

test('nearby NPCs exchange two lines and stop; distant and other-dimension players do not trigger greetings', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;
      return { status: 'ok', text: 'Fine weather.' };
    },
  });
  world.players.get('p')!.x = 2000;
  world.npcs![1].x = world.npcs![0].x + 50;
  world.npcs![1].y = world.npcs![0].y;
  life.tick(10_000, 0);
  await flush();
  life.tick(15_999, 0);
  assert.equal(calls, 1);
  life.tick(16_000, 0);
  await flush();
  assert.equal(calls, 2);
  assert.equal(world.chat![1].npcId, 'hallkeeper');
  life.tick(20_000, 0);
  assert.equal(calls, 2);
  life.close();
  const other = setup({
    generate: async () => {
      throw new Error('must not be called');
    },
  });
  other.world.players.get('p')!.scene = 'forest';
  other.life.tick(100_000, 1);
  await flush();
  assert.equal(other.world.chat, undefined);
  other.life.close();
});

test('outage announces silence once, keeps walking, and recovers after a shared retry interval', async () => {
  let calls = 0,
    available = false;
  const { world, life } = setup({
    generate: async () => {
      calls++;
      return available ? { status: 'ok', text: 'My voice is back!' } : { status: 'unavailable' };
    },
  });
  life.tick(10_000, 0);
  await flush();
  assert(world.npcs!.every((npc) => npc.silenced));
  assert.equal(world.chat!.length, 1);
  assert.equal(world.chat![0].tone, 'danger');
  life.tick(40_000, 0);
  assert.equal(calls, 1);
  life.tick(70_000, 0);
  await flush();
  assert.equal(world.chat!.length, 1);
  available = true;
  life.tick(130_000, 0);
  await flush();
  assert(world.npcs!.every((npc) => !npc.silenced));
  assert.equal(world.chat!.filter((m) => m.tone === 'success').length, 1);
  life.close();
});

test('late answers are discarded after scene transfer, range exit or world disposal', async () => {
  for (const action of ['scene', 'distance', 'close'] as const) {
    let finish!: (result: DialogueResult) => void;
    const { world, life } = setup({
      generate: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    life.tick(10_000, 0);
    if (action === 'scene') world.players.get('p')!.scene = 'forest';
    if (action === 'distance') world.players.get('p')!.x += 1000;
    if (action === 'close') life.close();
    finish({ status: 'ok', text: 'Too late!' });
    await flush();
    assert.equal(world.chat, undefined);
    life.close();
  }
});

test('moving Marta owns wrapped trading range, protocol deltas and detached interpolation', () => {
  const { world, life } = setup();
  const npc = world.npcs![0];
  npc.x = ARENA.width - 5;
  assert.equal(
    nearbyInteraction({ x: 5, y: npc.y - 15, hitpoints: 100 }, false, undefined, world.npcs)?.id,
    'innkeeper',
  );
  assert.equal(
    nearbyInteraction({ x: 300, y: 223, hitpoints: 100 }, false, undefined, world.npcs),
    null,
  );
  const state = new SessionState();
  const snapshot = {
    id: 'w',
    name: 'w',
    hostId: 'p',
    players: [],
    npcs: world.npcs,
    serverNow: 1000,
  };
  projectState(state, snapshot);
  const a = materializeState(state)!;
  npc.x = 5;
  projectState(state, { ...snapshot, serverNow: 1100 });
  const b = materializeState(state)!;
  assert.equal(a.npcs![0].x, ARENA.width - 5);
  assert.equal(b.npcs![0].x, 5);
  const buffer = new SnapshotBuffer('p');
  buffer.push(a, 0);
  buffer.push(b, 100);
  const rendered = buffer.render(150)!;
  const x = rendered.npcs![0].x;
  assert(x > ARENA.width - 6 || x < 6);
  assert.notEqual(rendered.npcs![0], b.npcs![0]);
  life.close();
});
