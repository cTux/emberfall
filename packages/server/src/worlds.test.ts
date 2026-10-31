import { connectWorldClient, waitForWorldMessage } from './worlds.fixture.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from './testing/socket.ts';
import type { ServerMessage } from '@emberfall/common';

import { createGameServer } from './worlds.ts';

test('world lifecycle, passwords, movement, capacity and isolation over real sockets', async () => {
  const app = await createGameServer();
  await app.listen(0, '127.0.0.1');
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const clients: WebSocket[] = [];

  const connect = () => {
    return connectWorldClient(address.port, clients);
  };

  try {
    const host = await connect();
    const guest = await connect();
    const initial = await guest.wait((m) => {
      return m.type === 'worlds';
    });
    assert(initial.type === 'worlds');
    assert.equal(initial.worlds.length, 1);
    const permanent = initial.worlds[0];
    assert.equal(permanent.name, 'Playtest Default');
    assert.equal(permanent.locked, false);
    assert.equal(permanent.players, 0);
    assert.equal(permanent.capacity, 32);
    host.send({ type: 'create', name: 'Test grove', playerName: 'Host', password: 'secret' });
    const joined = await host.wait((m) => {
      return m.type === 'joined';
    });
    assert(joined.type === 'joined');
    const id = joined.world.id;
    const listing = await guest.wait((m) => {
      return m.type === 'worlds' && m.worlds.length === 2;
    });
    assert(!JSON.stringify(listing).includes('secret'));
    guest.send({ type: 'join', worldId: id, playerName: 'Guest', password: 'wrong' });
    const error = await guest.wait((m) => {
      return m.type === 'error';
    });
    assert(error.type === 'error' && error.message.includes('Incorrect'));
    guest.send({ type: 'join', worldId: id, playerName: 'Guest', password: 'secret' });
    const other = await guest.wait((m) => {
      return m.type === 'joined';
    });
    assert(other.type === 'joined');
    assert.equal(other.world.players.length, 2);
    guest.send({ type: 'move', x: 500, y: 0 });
    await guest.wait((m) => {
      return m.type === 'error';
    });
    guest.send({ type: 'move', x: 1, y: 0 });
    await host.wait((m) => {
      return (
        m.type === 'state' &&
        m.world.players.some((p) => {
          return p.id === other.playerId && p.x > other.world.players[1].x;
        })
      );
    });
    host.send({ type: 'leave' });
    host.ws.close();
    await guest.wait((m) => {
      return (
        m.type === 'state' && m.world.hostId === other.playerId && m.world.players.length === 1
      );
    });
    for (let i = 0; i < 7; i++) {
      const c = await connect();
      c.send({ type: 'join', worldId: id, playerName: `Player ${i}`, password: 'secret' });
      await c.wait((m) => {
        return m.type === 'joined';
      });
    }

    const excess = await connect();
    excess.send({ type: 'join', worldId: id, playerName: 'Extra', password: 'secret' });
    const full = await excess.wait((m) => {
      return m.type === 'error';
    });
    assert(full.type === 'error' && full.message.includes('full'));
    excess.send({ type: 'create', name: 'Other world', playerName: 'Extra', password: '' });
    const isolated = await excess.wait((m) => {
      return m.type === 'joined';
    });
    assert(isolated.type === 'joined');
    assert.equal(isolated.world.players.length, 1);
    excess.messages.length = 0;
    await excess.wait((m) => {
      return m.type === 'state';
    });
    assert(
      excess.messages.every((m) => {
        return m.type !== 'state' || m.world.id !== id;
      }),
    );
    for (const ws of clients) {
      if (ws !== excess.ws) {
        ws.send(JSON.stringify({ type: 'leave' }));
      }
    }

    await excess.wait((m) => {
      return (
        m.type === 'worlds' &&
        !m.worlds.some((w) => {
          return w.id === id;
        })
      );
    });
    excess.send({ type: 'leave' });
    await excess.wait((m) => {
      return m.type === 'left';
    });
    await excess.wait((m) => {
      return m.type === 'worlds' && m.worlds.length === 1 && m.worlds[0].id === permanent.id;
    });
    excess.send({ type: 'create', name: ' ', playerName: 'Extra', password: '' });
    await excess.wait((m) => {
      return m.type === 'error';
    });
    excess.send({ type: 'join', worldId: id, playerName: 'Extra', password: 'secret' });
    const closed = await excess.wait((m) => {
      return m.type === 'error';
    });
    assert(closed.type === 'error' && closed.message.includes('closed'));
    const first = await connect();
    const second = await connect();
    first.send({ type: 'join', worldId: permanent.id, playerName: 'First', password: '' });
    const firstJoin = await first.wait((m) => {
      return m.type === 'joined';
    });
    assert(firstJoin.type === 'joined');
    assert.equal(firstJoin.world.hostId, firstJoin.playerId);
    second.send({ type: 'join', worldId: permanent.id, playerName: 'Second', password: '' });
    const secondJoin = await second.wait((m) => {
      return m.type === 'joined';
    });
    assert(secondJoin.type === 'joined');
    assert.equal(secondJoin.world.players.length, 2);
    second.messages.length = 0;
    first.send({ type: 'leave' });
    await second.wait((m) => {
      return (
        m.type === 'state' && m.world.hostId === secondJoin.playerId && m.world.players.length === 1
      );
    });
    second.send({ type: 'leave' });
    await second.wait((m) => {
      return m.type === 'left';
    });
    await second.wait((m) => {
      return (
        m.type === 'worlds' &&
        m.worlds.some((w) => {
          return w.id === permanent.id && w.players === 0;
        })
      );
    });
    second.send({ type: 'join', worldId: permanent.id, playerName: 'Returning', password: '' });
    const rejoined = await second.wait((m) => {
      return m.type === 'joined';
    });
    assert(rejoined.type === 'joined');
    assert.equal(rejoined.world.id, permanent.id);
    assert.equal(rejoined.world.hostId, rejoined.playerId);
    assert.equal(rejoined.world.players.length, 1);
    assert.equal(rejoined.world.scene, undefined);
    excess.messages.length = 0;
    second.send({ type: 'leave' });
    await excess.wait((m) => {
      return (
        m.type === 'worlds' &&
        m.worlds.some((w) => {
          return w.id === permanent.id && w.players === 0;
        })
      );
    });
  } finally {
    for (const ws of clients) {
      ws.terminate();
    }

    await app.close();
  }
});

test('Playtest Default admits 32 players and rejects the 33rd', async () => {
  const app = await createGameServer();
  await app.listen(0, '127.0.0.1');
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const clients: WebSocket[] = [];
  try {
    for (let i = 0; i < 33; i++) {
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
      clients.push(ws);
      const messages: ServerMessage[] = [];
      ws.on('message', (raw) => {
        return messages.push(JSON.parse(raw.toString()));
      });
      await once(ws, 'open');
      const wait = (type: ServerMessage['type']) => {
        return waitForWorldMessage(messages, type);
      };

      const listing = await wait('worlds');
      assert(listing.type === 'worlds');
      const world = listing.worlds[0];
      assert.equal(world.name, 'Playtest Default');
      assert.equal(world.capacity, 32);
      assert.equal(world.players, Math.min(i, 32));
      ws.send(
        JSON.stringify({
          type: 'join',
          worldId: world.id,
          playerName: `Player ${i}`,
          password: '',
        }),
      );
      if (i < 32) {
        const joined = await wait('joined');
        assert(joined.type === 'joined');
        assert.equal(joined.world.players.length, i + 1);
      } else {
        const error = await wait('error');
        assert(error.type === 'error');
        assert.match(error.message, /full/);
        assert(
          !messages.some((m) => {
            return m.type === 'joined';
          }),
        );
      }
    }
  } finally {
    for (const ws of clients) {
      ws.terminate();
    }

    await app.close();
  }
});
