import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VillageLife, type NpcWorld } from './npcs.ts';
import type { NpcDialogue, DialogueResult } from './npc-models.ts';

import { createPlayers } from './ecs/simulation.ts';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';

import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import { flush, player } from './npcs.fixture.ts';

function workingVillage(dialogue: NpcDialogue = { generate: async () => ({ status: 'busy' }) }) {
  const world: NpcWorld = { players: createPlayers() };
  world.players.set('p', player('p', 2000, 2000));
  const life = new VillageLife(world, dialogue, 0, () => 0);
  for (const npc of world.npcs!) {
    const station = VILLAGE_DEFINITION.workstations.find((s) => s.npcId === npc.id)!;
    Object.assign(npc, station.worker);
  }

  life.tick(45_000, 0); // Arrive at each first workstation.
  life.tick(45_001, 0); // Publish the active work pose.

  return { world, life };
}

test('every resident works at two home stations, stays a full minute and alternates jobs', () => {
  const { world, life } = workingVillage();
  const stations = VILLAGE_DEFINITION.workstations;
  assert.equal(stations.length, 8);
  assert.equal(new Set(stations.map((s) => s.id)).size, 8);
  for (const npc of world.npcs!) {
    const own = stations.filter((s) => s.npcId === npc.id);
    assert.equal(own.length, 2);
    assert(own.every((s) => s.buildingId === npc.buildingId));
    const building = VILLAGE_DEFINITION.buildings.find((b) => b.id === npc.buildingId)!;
    assert(own.every((s) => Math.hypot(s.x - building.x, s.y - building.y) < 100));
    assert.equal(npc.workstationId, own[0].id);
    assert.equal(npc.moving, false);
    assert.deepEqual({ x: npc.x, y: npc.y }, own[0].worker);
  }

  life.tick(105_000, 59.999);
  assert(
    world.npcs!.every((n) => n.workstationId),
    'no job ends before 60 active seconds',
  );
  life.tick(105_001, 0.001);
  assert(world.npcs!.every((n) => !n.workstationId));
  for (const npc of world.npcs!) {
    const second = stations.filter((s) => s.npcId === npc.id)[1];
    Object.assign(npc, second.worker);
  }

  life.tick(150_000, 0);
  life.tick(150_001, 0);
  for (const npc of world.npcs!)
    assert.equal(npc.workstationId, stations.filter((s) => s.npcId === npc.id)[1].id);
  life.close();
});

test('workers return by walking before starting their job and never teleport home', () => {
  const { world, life } = workingVillage();
  const npc = world.npcs![0];
  life.tick(105_001, 60);
  Object.assign(npc, { x: 4700, y: 291 });
  const before = { x: npc.x, y: npc.y };
  life.tick(150_000, 0.05);
  assert(npc.moving);
  assert.equal(npc.workstationId, undefined);
  const distance = Math.hypot(npc.x - before.x, npc.y - before.y);
  assert(distance <= 38 * 0.05 + 0.001);
  assert(npc.x > before.x, 'uses the short wrapped route home');
  life.close();
});

test('trading and empty-village time suspend work without consuming its remaining minute', async () => {
  const { world, life } = workingVillage();
  const npc = world.npcs![0];
  const trader = world.players.get('p')!;
  life.tick(65_001, 20);
  const station = npc.workstationId;
  Object.assign(trader, { x: npc.x, y: npc.y - 15 });
  life.interact(trader, npc.id);
  assert.equal(npc.workstationId, undefined, 'interaction changes the pose immediately');
  life.tick(165_001, 100);
  await flush();
  assert.equal(npc.workstationId, undefined);
  life.interact(trader, null);
  trader.scene = 'forest';
  life.tick(265_001, 100);
  trader.scene = undefined;
  Object.assign(trader, { x: 2000, y: 2000 });
  life.tick(265_002, 0);
  assert.equal(npc.workstationId, station);
  life.tick(305_001, 39.999);
  assert.equal(npc.workstationId, station);
  life.tick(305_002, 0.001);
  assert.equal(npc.workstationId, undefined);
  life.close();
});

test('directed speech suspends work through reply delay, generation and visible speech, then resumes', async () => {
  let finish!: (result: DialogueResult) => void;
  const { world, life } = workingVillage({
    generate: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const npc = world.npcs![0];
  const station = npc.workstationId;
  const speaker = world.players.get('p')!;
  Object.assign(speaker, { x: npc.x, y: npc.y - 15 });
  life.hear(speaker, '@Marta How is the cooking?', 45_002);
  assert.equal(npc.workstationId, undefined);
  life.tick(47_001, 1.999);
  assert.equal(npc.workstationId, undefined);
  life.tick(47_002, 0.001);
  life.tick(60_000, 12.998);
  assert.equal(npc.workstationId, undefined);
  finish({ status: 'ok', text: 'The soup is ready!' });
  await flush();
  Object.assign(speaker, { x: 2000, y: 2000 });
  life.tick(69_999, 9.999);
  assert.equal(npc.workstationId, undefined);
  life.tick(70_000, 0.001);
  assert.equal(npc.workstationId, station);
  life.tick(129_998, 59.998);
  assert.equal(npc.workstationId, station, 'conversation time did not consume the work session');
  life.close();
});

test('active work fields survive protocol projection and stay detached across pose changes', () => {
  const { world, life } = workingVillage();
  const state = new SessionState();
  const snapshot = { id: 'w', name: 'w', hostId: 'p', players: [], npcs: world.npcs };
  projectState(state, snapshot);
  const working = materializeState(state)!;
  const npc = world.npcs![0];
  assert.equal(working.npcs![0].workstationId, npc.workstationId);
  assert.equal(working.npcs![0].workStartedAt, npc.workStartedAt);
  Object.assign(world.players.get('p')!, { x: npc.x, y: npc.y - 15 });
  life.interact(world.players.get('p')!, npc.id);
  projectState(state, snapshot);
  assert.equal(materializeState(state)!.npcs![0].workstationId, undefined);
  assert(working.npcs![0].workstationId);
  life.close();
});
