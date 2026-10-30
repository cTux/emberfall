import assert from 'node:assert/strict';
import test from 'node:test';
import { freshMerchant } from '@emberfall/core';
import type { Player, ServerMessage } from '@emberfall/common';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';
import { freshProgress } from './characters.ts';
import { commitCharacterCommand, isCharacterCommand } from './commands/character.ts';

function player(): Player {
  return { ...freshProgress(), id: 'player', name: 'Player', x: 0, y: 0, color: 0 };
}

test('character commands publish only after a successful detached save', () => {
  const current = player();
  const previousName = current.storages![0].name;
  let saved = false;
  commitCharacterCommand(
    { type: 'renameStorage', tab: 0, name: 'Supplies' },
    current,
    { id: 'world' },
    'character',
    {
      merchant: () => freshMerchant(),
      save: (_id, _name, next) => {
        assert.equal(current.storages![0].name, previousName);
        assert.equal(next.storages![0].name, 'Supplies');
        saved = true;
      },
    },
  );
  assert(saved);
  assert.equal(current.storages![0].name, 'Supplies');
});

test('failed saves retain live inventory and shared merchant state', () => {
  const current = player();
  const world = { id: 'world', merchant: freshMerchant() };
  const before = structuredClone({ current, world });
  assert.throws(
    () =>
      commitCharacterCommand(
        { type: 'renameStorage', tab: 0, name: 'Supplies' },
        current,
        world,
        'character',
        {
          merchant: () => freshMerchant(),
          save: () => {
            throw new Error('disk failed');
          },
        },
      ),
    /Unable to save item action/,
  );
  assert.deepEqual({ current, world }, before);
});

test('dispatch only admits the durable character command group', () => {
  assert(isCharacterCommand({ type: 'useItem', id: 'item' }));
  assert(!isCharacterCommand({ type: 'leave' }));
  assert(!isCharacterCommand({ type: 'ping', id: 1 }));
});

test(
  'post-commit delivery failures retain the generic client error',
  { timeout: 5000 },
  async (t) => {
    const runtime = await createRuntime();
    t.after(() => runtime.close());
    const errors: string[] = [];
    let failState = false;
    let joined!: (message: Extract<ServerMessage, { type: 'joined' }>) => void;
    const ready = new Promise<Extract<ServerMessage, { type: 'joined' }>>((resolve) => {
      joined = resolve;
    });
    const peer = new Peer(
      (message) => {
        if (message.type === 'state' && failState) {
          failState = false;
          throw new Error('private delivery detail');
        }
        if (message.type === 'joined') joined(message);
        if (message.type === 'error') errors.push(message.message);
      },
      () => {},
    );
    runtime.connect(peer);
    peer.receive({ type: 'create', name: 'World', playerName: 'Player', password: '' });
    const message = await ready;
    const current = message.world.players.find((entry) => entry.id === message.playerId)!;
    failState = true;
    peer.receive({ type: 'setTactics', classId: current.classId ?? 'warrior', tactics: {} });
    assert.deepEqual(errors, ['Unable to save item action. Please retry.']);
  },
);
