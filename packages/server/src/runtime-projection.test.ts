import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatMessage, Player } from '@emberfall/common';
import { MAX_PLAYERS } from '@emberfall/core';
import { freshProgress } from './characters.ts';
import { Parties } from './parties.ts';
import { createWorldProjection } from './runtime/projection.ts';
import type { World } from './runtime/models.ts';

function fixture() {
  const world: World = {
    id: 'world',
    name: 'World',
    hostId: 'alice',
    salt: 'private-salt',
    hash: Buffer.from('private-hash'),
    players: new Map(),
    resources: {},
  };
  const parties = new Parties(world);
  const projection = createWorldProjection(
    () => parties,
    (world, viewer) => (viewer?.scene ? parties.run(viewer) : world),
  );
  const player = (id: string): Player => ({
    ...freshProgress(),
    id,
    name: id,
    x: 0,
    y: 0,
    color: 0,
    homeRunId: id,
    runId: id,
    scene: 'forest',
  });
  const alice = player('alice');
  const bob = player('bob');
  world.players.set(alice.id, alice);
  world.players.set(bob.id, bob);
  return { world, parties, projection, alice, bob };
}

test('world snapshots and lobby summaries omit credentials and preserve public capacity', () => {
  const { world, projection, alice } = fixture();
  const state = projection.state(world, 1000, alice);
  assert.equal(state.serverNow, 1000);
  assert.equal(Object.hasOwn(state, 'salt'), false);
  assert.equal(Object.hasOwn(state, 'hash'), false);
  const temporary: World = { ...world, id: 'temporary', hash: undefined };
  const list = projection.list(
    new Map([
      [world.id, world],
      [temporary.id, temporary],
    ]),
    world,
  );
  assert.deepEqual(
    list.worlds.map(({ locked, capacity }) => ({ locked, capacity })),
    [
      { locked: true, capacity: 32 },
      { locked: false, capacity: MAX_PLAYERS },
    ],
  );
  assert(!JSON.stringify([state, list]).includes('private-'));
});

test('projection filters private chat, dimensions and run players/resources for each viewer', () => {
  const { world, parties, projection, alice, bob } = fixture();
  const message = (id: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
    id,
    playerId: '',
    name: '',
    text: id,
    ...extra,
  });
  world.chat = [
    message('public'),
    message('alice-only', { recipientIds: ['alice'] }),
    message('bob-only', { recipientIds: ['bob'] }),
    message('forest', { dimension: 'forest' }),
    message('village', { dimension: 'village' }),
  ];
  const aliceResources = (parties.run(alice).resources = {});
  const bobResources = (parties.run(bob).resources = {});
  const a = projection.state(world, 1000, alice);
  const b = projection.state(world, 1000, bob);
  assert.deepEqual(
    a.players.map(({ id }) => id),
    ['alice'],
  );
  assert.deepEqual(
    b.players.map(({ id }) => id),
    ['bob'],
  );
  assert.deepEqual(
    a.chat!.map(({ id }) => id),
    ['public', 'alice-only', 'forest'],
  );
  assert.deepEqual(
    b.chat!.map(({ id }) => id),
    ['public', 'bob-only', 'forest'],
  );
  assert.equal(a.resources, aliceResources);
  assert.equal(b.resources, bobResources);
  assert.notEqual(a.resources, b.resources);
  const anonymous = projection.state(world, 1000);
  assert.deepEqual(
    anonymous.chat!.map(({ id }) => id),
    ['public', 'village'],
  );
  assert.equal(anonymous.resources, world.resources);
});
