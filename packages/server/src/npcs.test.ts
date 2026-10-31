import { test } from 'node:test';
import assert from 'node:assert/strict';

import { nearbyInteraction, ARENA } from '@emberfall/core';
import { VillageLife, type NpcWorld } from './npcs.ts';

import { createPlayers, simulationFor } from './ecs/simulation.ts';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';
import { SnapshotBuffer } from '../../client/src/snapshots.ts';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import { player, setup } from './npcs.fixture.ts';

test('four residents walk near players, pause during interaction, and release authoritative ECS entities', () => {
  const { world, life } = setup();
  assert.deepEqual(
    world.npcs!.map((n) => {
      return n.buildingId;
    }),
    ['inn', 'hall', 'workshop', 'lodge'],
  );
  assert.equal(simulationFor(world.players)!.villagers.size, 4);
  const marta = world.npcs![0],
    initial = { x: marta.x, y: marta.y };
  life.tick(9000, 0.05);
  assert(marta.moving);
  assert(Math.hypot(marta.x - initial.x, marta.y - initial.y) <= 38 * 0.05 + 0.001);
  assert.notEqual(marta.y, initial.y);
  life.interact(world.players.get('p')!, marta.id);
  const paused = { x: marta.x, y: marta.y };
  life.tick(9050, 0.05);
  assert.equal(marta.moving, false);
  assert.deepEqual({ x: marta.x, y: marta.y }, paused);
  life.interact(world.players.get('p')!, null);
  life.tick(9075, 0.05);
  assert(marta.moving, 'closing the interaction releases Marta while the player stays nearby');
  world.players.clear();
  life.tick(9100, 0.05);
  assert.equal(marta.moving, false);
  life.close();
  assert.equal(simulationFor(world.players)!.villagers.size, 0);
});

test('interactions validate live wrapped range and release invalid traders without resuming stale interactions', () => {
  for (const action of ['distance', 'scene', 'death', 'disconnect', 'leave'] as const) {
    const { world, life } = setup();
    const trader = world.players.get('p')!;
    world.players.set('observer', player('observer', 2000, 2000));
    const marta = world.npcs![0];
    Object.assign(marta, { x: ARENA.width - 5, y: 238 });
    Object.assign(trader, { x: 5, y: 223 });
    life.interact(trader, marta.id);
    life.tick(9000, 0.05);
    assert.equal(marta.moving, false, 'trading works across a wrapped seam');

    if (action === 'distance') {
      trader.x = 1000;
    }

    if (action === 'scene') {
      trader.scene = 'forest';
    }

    if (action === 'death') {
      trader.hitpoints = 0;
    }

    if (action === 'disconnect') {
      trader.reconnecting = true;
    }

    if (action === 'leave') {
      world.players.delete(trader.id);
    }

    life.tick(9050, 0.05);
    assert(marta.moving, action);
    Object.assign(trader, { x: 5, scene: undefined, hitpoints: 100, reconnecting: false });
    world.players.set(trader.id, trader);
    life.tick(9100, 0.05);
    assert(marta.moving, 'returning to range does not reopen the interaction');
    life.close();
  }
});

test('remote or invalid interactions cannot stop residents and multiple traders release independently', () => {
  const { world, life } = setup();
  const trader = world.players.get('p')!;
  const marta = world.npcs![0];
  trader.x = 1000;
  life.interact(trader, marta.id);
  life.tick(9000, 0.05);
  assert(marta.moving);
  Object.assign(trader, { x: marta.x, y: marta.y - 15 });
  life.interact(trader, 'unknown');
  life.tick(9050, 0.05);
  assert(marta.moving);
  const second = player('q', marta.x, marta.y - 15);
  world.players.set(second.id, second);
  life.interact(trader, marta.id);
  life.interact(second, marta.id);
  life.interact(trader, null);
  life.tick(9100, 0.05);
  assert.equal(marta.moving, false, 'another active trader still holds Marta');
  life.interact(second, null);
  life.tick(9150, 0.05);
  assert(marta.moving);
  life.close();
});

test('residents choose separate destinations and leave the circuit with randomized pauses', () => {
  let roll = 0;
  const world: NpcWorld = { players: createPlayers() };
  world.players.set('p', player('p', 2000, 2000));
  const life = new VillageLife(
    world,
    {
      generate: async () => {
        return { status: 'busy' };
      },
    },
    0,
    () => {
      return roll;
    },
  );
  const npcs = world.npcs!;

  // Even identical random rolls give co-located residents different destinations.
  for (const npc of npcs) {
    Object.assign(npc, { x: 400, y: 400 });
  }

  life.tick(4999, 0.05);
  assert(
    npcs.every((npc) => {
      return !npc.moving;
    }),
  );
  life.tick(5000, 0.05);
  assert(
    npcs.every((npc) => {
      return npc.moving;
    }),
  );
  assert.equal(
    new Set(
      npcs.map((npc) => {
        return npc.angle;
      }),
    ).size,
    4,
  );

  // Keep conversations from interrupting the pause measurement.
  for (const [index, npc] of npcs.slice(1).entries()) {
    Object.assign(npc, { x: 1000 + index * 300, y: 1000 });
  }

  const marta = npcs[0];
  Object.assign(marta, VILLAGE_DEFINITION.npcStops[0]);
  roll = 0.99;
  life.tick(6000, 0);
  assert.equal(marta.moving, false);
  life.tick(14_959, 0.05);
  assert.equal(marta.moving, false);
  life.tick(14_960, 0.05);
  assert.equal(marta.moving, true);
  const destination = VILLAGE_DEFINITION.npcStops.at(-1)!;
  assert.equal(marta.angle, Math.atan2(destination.y - 320, destination.x - 330));
  life.close();
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

test('Bram remains paused for his own interaction when Marta is also in range', () => {
  const { world, life } = setup();
  try {
    const hero = world.players.get('p')!;
    const bram = world.npcs!.find((npc) => {
      return npc.id === 'craftsman';
    })!;
    Object.assign(hero, { x: 1000, y: 985 });
    Object.assign(bram, { x: 1000, y: 1000 });
    Object.assign(world.npcs![0], { x: 1020, y: 1000 });
    life.interact(hero, bram.id);
    const position = { x: bram.x, y: bram.y };
    life.tick(9000, 0.05);
    assert.equal(bram.moving, false);
    assert.deepEqual({ x: bram.x, y: bram.y }, position);
    Object.assign(hero, { x: 2000, y: 2000 });
    life.tick(9050, 0.05);
    assert.equal(bram.moving, true);
  } finally {
    life.close();
  }
});
