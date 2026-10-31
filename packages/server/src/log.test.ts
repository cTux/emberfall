import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ServerMessage } from '@emberfall/common';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';

test('logs major lifecycle events while combat, ticks, chat and successful autosaves stay quiet', async (t) => {
  const lines: string[] = [];
  t.mock.method(console, 'info', (line: string) => {
    return lines.push(line);
  });
  t.mock.timers.enable({ apis: ['Date', 'setInterval', 'setTimeout'], now: Date.now() });
  const runtime = await createRuntime(':memory:', {
    generate: async () => {
      return { status: 'unavailable' };
    },
  });
  const messages: ServerMessage[] = [];
  const connect = () => {
    const peer = new Peer(
      (message) => {
        return messages.push(message);
      },
      () => {},
    );
    runtime.connect(peer);

    return peer;
  };

  try {
    const first = connect();
    first.receive({
      type: 'create',
      name: 'Private world name',
      playerName: 'Private name',
      password: '',
    });
    const joined = messages.find((message) => {
      return message.type === 'joined';
    });
    assert(joined?.type === 'joined');
    const player = runtime.worlds.get(joined.world.id)!.players.get(joined.playerId)!;
    player.x = 125;
    player.y = 355;
    first.receive({
      type: 'combatInput',
      autoAttack: true,
      autoTarget: true,
      attacking: false,
      aimX: 175,
      aimY: 355,
    });
    const count = lines.length;
    first.receive({ type: 'move', seq: 1, x: 1, y: 0 });
    first.receive({ type: 'chat', text: 'Private chat text' });
    messages.length = 0;
    t.mock.timers.tick(RUNTIME.autosaveMs);
    assert(
      messages.some((message) => {
        return message.type === 'saved';
      }),
      'autosave ran',
    );
    assert(
      messages.some((message) => {
        return message.type === 'state' && message.world.training?.damage?.length;
      }),
      'combat produced damage',
    );
    assert.equal(lines.length, count, 'routine activity must not emit logs');
    const errors: string[] = [];
    t.mock.method(console, 'error', (line: string) => {
      return errors.push(line);
    });
    const save = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('Injected write failure');
    });
    t.mock.timers.tick(RUNTIME.autosaveMs);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Z ERROR Character autosave failed; retrying:/);
    save.mock.restore();
    first.detached(1006);
    const next = connect();
    next.receive({
      type: 'resume',
      worldId: joined.world.id,
      characterToken: joined.characterToken,
    });
    assert(
      lines.some((line) => {
        return line.includes('Player reconnected');
      }),
    );
    next.receive({ type: 'leave' });
    next.close();
  } finally {
    await runtime.close();
  }

  for (const event of [
    'Runtime ready',
    'Client connected',
    'World created',
    'Player joined world',
    'Client disconnected',
    'Waiting for player reconnect',
    'Player left world',
    'Empty world removed',
    'Runtime stopping',
    'Runtime stopped',
  ]) {
    assert(
      lines.some((line) => {
        return line.includes(event);
      }),
      event,
    );
  }

  assert(
    lines.every((line) => {
      return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z INFO /.test(line);
    }),
  );
  const output = lines.join('\n');
  assert(!output.includes('Private'));

  for (const message of messages) {
    if (message.type === 'joined' && message.characterToken) {
      assert(!output.includes(message.characterToken));
    }
  }
});
