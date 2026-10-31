import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from './testing/socket.ts';
import type { Player, ServerMessage } from '@emberfall/common';
import { TREES, moveActor } from '@emberfall/core';
import { createGameServer } from './worlds.ts';

test('the server allows a connected player to walk into a tree', async () => {
  const app = await createGameServer();
  await app.listen(0, '127.0.0.1');
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
  let player: Player | undefined;
  const samples: Player[] = [];
  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as ServerMessage;

    if (message.type === 'joined' || message.type === 'state') {
      player = message.world.players[0];
      samples.push(player);
    }
  });
  try {
    await once(ws, 'open');
    ws.send(
      JSON.stringify({
        type: 'create',
        name: 'Pass-through check',
        playerName: 'Walker',
        password: '',
      }),
    );
    const tree = [...TREES].sort((a, b) => {
      return Math.hypot(a.x - 420, a.y - 363) - Math.hypot(b.x - 420, b.y - 363);
    })[0];

    for (let i = 0; i < 70; i++) {
      if (player) {
        const dx = tree.x - player.x;
        const dy = tree.y - 8 - (player.y + 15);
        const length = Math.max(1, Math.hypot(dx, dy));
        ws.send(JSON.stringify({ type: 'move', x: dx / length, y: dy / length }));
      }

      await new Promise((resolve) => {
        return setTimeout(resolve, 50);
      });
    }

    assert(player);
    assert(samples.length > 30);
    assert(Math.hypot(player.x - tree.x, player.y + 15 - (tree.y - 8)) < 38);
    assert(
      samples.some((sample) => {
        return Math.hypot(sample.x - tree.x, sample.y + 15 - (tree.y - 8)) < tree.radius;
      }),
      'the server must allow the player inside the trunk',
    );
  } finally {
    ws.terminate();
    await app.close();
  }
});

test('tree trunks block player and enemy bodies, including fast movement, with sliding', async () => {
  const tree = TREES.find((t) => {
    return (
      t.x > 100 &&
      t.x < 800 &&
      t.y > 100 &&
      TREES.every((other) => {
        return other === t || Math.hypot(other.x - t.x, other.y - t.y) > 80;
      })
    );
  });
  assert(tree);

  for (const radius of [12, 18]) {
    const start: { x: number; y: number } = {
      x: tree.x - tree.radius - radius - 10,
      y: tree.y - 8,
    };
    const blocked = moveActor(start, 200, 0, radius);
    assert(blocked.x < tree.x - tree.radius - radius);
    assert(blocked.x > start.x);
    const slide = moveActor({ x: blocked.x, y: blocked.y }, 9, 9, radius);
    assert(slide.y > blocked.y);
    assert(Math.hypot(slide.x - tree.x, slide.y - (tree.y - 8)) >= radius + tree.radius);
    const free = moveActor({ x: 480, y: 335 }, 9, 0, radius);
    assert.deepEqual(free, { x: 489, y: 335 });
  }
});
