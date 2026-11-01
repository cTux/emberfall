import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WorldState } from '../packages/common/src/index.ts';
import { retainWorldChat } from '../packages/client/src/world-chat.ts';

const previous: WorldState = {
  id: 'world',
  name: 'World',
  hostId: 'host',
  players: [],
  serverNow: 1,
  chat: [{ id: 'message', playerId: 'friend', name: 'Friend', text: 'Hello' }],
};

test('movement snapshots retain chat identity without retaining old world state', () => {
  const next = structuredClone(previous);
  next.serverNow = 2;
  const result = retainWorldChat(next)(previous);
  assert.equal(result.chat, previous.chat);
  assert.equal(result.serverNow, 2);
  assert.equal(result.players, next.players);
  assert.notEqual(next.chat, previous.chat);
});

test('message edits, visibility changes, removals and world transfers invalidate chat', () => {
  const changes: ((world: WorldState) => void)[] = [
    (world) => {
      world.chat![0].text = 'Edited';
    },
    (world) => {
      world.chat![0].dimension = 'forest';
    },
    (world) => {
      world.chat![0].excludedPlayerId = 'me';
    },
    (world) => {
      world.chat![0].recipientIds = ['me'];
    },
    (world) => {
      world.chat = [];
    },
    (world) => {
      world.id = 'another-world';
    },
  ];

  for (const change of changes) {
    const next = structuredClone(previous);
    change(next);
    assert.equal(retainWorldChat(next)(previous), next);
  }

  assert.equal(retainWorldChat(previous)(null), previous);
});
