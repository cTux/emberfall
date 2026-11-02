import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { matchMaker } from '@colyseus/core';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { MILLISECONDS_PER_SECOND } from '@emberfall/core/contracts';
import { createGameServer } from './worlds.ts';
import { MAX_SESSIONS } from './runtime/limits.ts';
import { Peer } from './network/peer.ts';
import { heroId, steamRequest } from './testing/steam.ts';
import { sessionCookie } from './session-cookie.ts';

test('HTTP matchmaking authenticates before allocation and rejects reused or revoked tickets', async () => {
  const origin = 'https://game.example';
  const app = await createGameServer(undefined, ':memory:', undefined, {
    origin,
    apiKey: 'test',
    request: steamRequest,
  });
  await app.listen(0);
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const store = app.runtime.characters;
  store.loginSteam(heroId, 'Hero');
  store.renameSteam(heroId, 'Hero');
  // The account remains valid throughout this bounded local fixture.
  const token = store.createSession(heroId, Date.now() + 60_000);
  const headers = { Origin: origin, 'Content-Type': 'application/json' };

  const reserve = async (method: string, ticket?: unknown, requestOrigin = origin) => {
    return fetch(`${base}/matchmake/${method}/session`, {
      method: 'POST',
      headers: { ...headers, Origin: requestOrigin },
      body: JSON.stringify({ protocolVersion: RUNTIME.protocolVersion, ticket }),
    });
  };

  const ticket = async () => {
    const response = await fetch(`${base}/api/account/ticket`, {
      method: 'POST',
      headers: { ...headers, Cookie: `${sessionCookie}=${token}` },
    });
    assert.equal(response.status, 200);

    return (await response.json()).ticket as string;
  };

  try {
    for (const method of ['create', 'joinOrCreate', 'join']) {
      for (const invalid of [undefined, 'forged', { ticket: 'forged' }]) {
        assert.equal((await reserve(method, invalid)).status, 401);
        assert.equal((await matchMaker.query()).length, 0);
      }
    }

    const valid = await ticket();
    assert.equal((await reserve('create', valid, 'https://evil.example')).status, 401);
    assert.equal((await matchMaker.query()).length, 0);
    assert.equal((await reserve('create', valid)).status, 200);
    assert.equal((await matchMaker.query()).length, 1);
    assert.equal((await reserve('create', valid)).status, 401);
    assert.equal((await matchMaker.query()).length, 1);

    const revoked = await ticket();
    store.revokeSession(token);
    assert.equal((await reserve('joinOrCreate', revoked)).status, 401);
    assert.equal((await matchMaker.query()).length, 1);
  } finally {
    await app.close();
  }
});

test('pending rooms and retained runtime sessions share the capacity budget', async () => {
  const app = await createGameServer();
  await app.listen(0);
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const reserve = async () => {
    return fetch(`http://127.0.0.1:${address.port}/matchmake/create/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolVersion: RUNTIME.protocolVersion }),
    });
  };

  try {
    // Leave one slot for concurrent HTTP requests, without opening hundreds of sockets.
    for (let index = 0; index < MAX_SESSIONS - 1; index++) {
      app.runtime.connect(
        new Peer(
          () => {},
          () => {},
        ),
      );
    }

    const results = await Promise.all([reserve(), reserve(), reserve()]);
    assert.equal(
      results.filter((result) => {
        return result.ok;
      }).length,
      1,
    );
    const rooms = await matchMaker.query();
    assert.equal(rooms.length, 1);
    assert.equal((await reserve()).ok, false);
    await matchMaker.getLocalRoomById(rooms[0].roomId).disconnect();
    assert.equal((await reserve()).ok, true);
  } finally {
    await app.close();
  }
});

test('abandoned seat expiry disposes the room and releases admission capacity', async () => {
  const app = await createGameServer();
  await app.listen(0);
  // Shorten only this fixture's framework reservation timer; production keeps its default.
  const seatSeconds = 0.05;
  matchMaker.getHandler('session').on('create', (room) => {
    room.seatReservationTimeout = seatSeconds;
  });
  try {
    const reservation = await matchMaker.create('session', {
      protocolVersion: RUNTIME.protocolVersion,
    });
    assert.equal((await matchMaker.query()).length, 1);
    // Four reservation periods allow the disposal callback to settle on busy CI hosts.
    const disposalPeriods = 4;
    await setTimeout(seatSeconds * MILLISECONDS_PER_SECOND * disposalPeriods);
    assert.equal((await matchMaker.query()).length, 0);
    assert.equal(matchMaker.getLocalRoomById(reservation.roomId), undefined);

    for (let index = 0; index < MAX_SESSIONS - 1; index++) {
      app.runtime.connect(
        new Peer(
          () => {},
          () => {},
        ),
      );
    }

    await matchMaker.create('session', { protocolVersion: RUNTIME.protocolVersion });
  } finally {
    await app.close();
  }
});
