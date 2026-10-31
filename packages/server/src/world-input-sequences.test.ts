import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from './testing/socket.ts';
import type { Player, ServerMessage } from '@emberfall/common';

import { createGameServer } from './worlds.ts';

test('latest input is coalesced, held between packets, timed out and rejected across areas', async () => {
  const app = await createGameServer();
  await app.listen(0, '127.0.0.1');
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
  const samples: Player[] = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString()) as ServerMessage;

    if (m.type === 'state' || m.type === 'joined') {
      samples.push(m.world.players[0]);
    }
  });
  const wait = async (predicate: () => boolean) => {
    const until = Date.now() + 3000;
    while (!predicate()) {
      assert(Date.now() < until, 'timed out');
      await new Promise((r) => {
        return setTimeout(r, 10);
      });
    }
  };

  try {
    await once(ws, 'open');
    ws.send(
      JSON.stringify({ type: 'create', name: 'Sequence test', playerName: 'Tester', password: '' }),
    );
    await wait(() => {
      return samples.length > 0;
    });

    for (let seq = 1; seq <= 4; seq++) {
      ws.send(JSON.stringify({ type: 'move', seq, epoch: 'lobby', x: 1, y: 0 }));
    }

    ws.send(JSON.stringify({ type: 'move', seq: 4, epoch: 'lobby', x: -1, y: 0 }));
    await wait(() => {
      return samples.some((p) => {
        return p.inputSeq === 4;
      });
    });
    const first = samples.find((p) => {
      return p.inputSeq === 4;
    })!;
    assert.equal(first.x, 429, 'a burst must consume only one movement step');
    await new Promise((r) => {
      return setTimeout(r, 380);
    });
    const stopped = samples.at(-1)!;
    assert(stopped.x > first.x, 'direction persists between heartbeats');
    // A packet received at a tick boundary moves at ages 0, 50, ... 250:
    // six steps. Other tick phases permit five. The timeout is inclusive.
    assert(stopped.x <= 474, 'missing heartbeat stops movement after 250ms');
    await new Promise((r) => {
      return setTimeout(r, 100);
    });
    assert.equal(samples.at(-1)!.x, stopped.x);
    ws.send(JSON.stringify({ type: 'move', seq: 5, epoch: 'old-scene', x: 1, y: 0 }));
    await wait(() => {
      return samples.some((p) => {
        return p.inputSeq === 5;
      });
    });
    assert.equal(samples.at(-1)!.x, stopped.x);
    ws.send(JSON.stringify({ type: 'move', seq: 6, epoch: 'lobby', x: 0, y: 0 }));
    await wait(() => {
      return samples.some((p) => {
        return p.inputSeq === 6;
      });
    });
    assert.equal(samples.at(-1)!.x, stopped.x);
  } finally {
    ws.terminate();
    await app.close();
  }
});

test('timed inputs acknowledge partial steps, reject stale areas and cannot accelerate the server', async () => {
  const app = await createGameServer();
  await app.listen(0, '127.0.0.1');
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
  const samples: (Player & { observedAt: number; isPatch: boolean })[] = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString()) as ServerMessage;

    if (m.type === 'state' || m.type === 'joined') {
      samples.push({
        ...m.world.players[0],
        observedAt: m.world.serverNow!,
        isPatch: m.type === 'state',
      });
    }
  });
  const wait = async (predicate: () => boolean) => {
    const until = Date.now() + 3000;
    while (!predicate()) {
      assert(Date.now() < until, 'timed out');
      await new Promise((r) => {
        return setTimeout(r, 10);
      });
    }
  };

  try {
    await once(ws, 'open');
    ws.send(
      JSON.stringify({ type: 'create', name: 'Sequence test', playerName: 'Tester', password: '' }),
    );
    await wait(() => {
      return samples.length > 0;
    });
    ws.send(JSON.stringify({ type: 'move', seq: 1, epoch: 'lobby', x: 1, y: 0, durationMs: 20 }));
    ws.send(JSON.stringify({ type: 'move', seq: 2, epoch: 'lobby', x: 1, y: 0, durationMs: 40 }));
    await wait(() => {
      return samples.some((p) => {
        return p.inputSeq === 2 && p.inputElapsed === 40;
      });
    });
    // Partial-step budgeting is checked deterministically in movement-system.test.ts.
    // Colyseus may coalesce intermediate ticks into one patch.
    assert(Math.abs(samples.at(-1)!.x - 430.8) < 0.001);
    const stopped = samples.at(-1)!.x;
    await new Promise((r) => {
      return setTimeout(r, 100);
    });
    assert.equal(samples.at(-1)!.x, stopped, 'acknowledged duration is never applied twice');
    ws.send(JSON.stringify({ type: 'move', seq: 3, epoch: 'expired', x: 1, y: 0, durationMs: 50 }));
    await wait(() => {
      return samples.some((p) => {
        return p.inputSeq === 3;
      });
    });
    assert.equal(samples.at(-1)!.x, stopped);

    for (let seq = 4; seq <= 13; seq++) {
      ws.send(JSON.stringify({ type: 'move', seq, epoch: 'lobby', x: 1, y: 0, durationMs: 50 }));
    }

    await wait(() => {
      return samples.some((p) => {
        return p.inputSeq === 13;
      });
    });

    for (let i = 1; i < samples.length; i++) {
      if (samples[i].isPatch && samples[i - 1].isPatch) {
        assert(
          samples[i].x - samples[i - 1].x <=
            (samples[i].observedAt - samples[i - 1].observedAt) * 0.18 + 0.001,
        );
      }
    }

    const cast = {
      type: 'cast',
      id: 1,
      epoch: 'expired',
      classId: 'warrior',
      autoTarget: false,
      aimX: 600,
      aimY: 340,
    };
    ws.send(JSON.stringify(cast));
    await wait(() => {
      return samples.some((p) => {
        return p.castSeq === 1;
      });
    });
    assert.equal(
      samples.at(-1)!.attackId,
      undefined,
      'stale-area requests are acknowledged but never cast',
    );
    ws.send(JSON.stringify({ ...cast, epoch: 'lobby' }));
    await new Promise((r) => {
      return setTimeout(r, 100);
    });
    assert.equal(samples.at(-1)!.castSeq, 1);
    assert.equal(samples.at(-1)!.attackId, undefined, 'duplicate request IDs cannot be replayed');
  } finally {
    ws.terminate();
    await app.close();
  }
});
