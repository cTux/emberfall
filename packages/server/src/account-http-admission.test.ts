import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@colyseus/sdk';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { SessionState } from '@emberfall/common/protocol';

import { createGameServer } from './worlds.ts';

import { steamRequest, steamCallback, heroId, friendId } from './testing/steam.ts';

test('HTTP login binding, CSRF, onboarding, account isolation, SDK admission and logout', async () => {
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
  const call = (
    path: string,
    cookies = '',
    method: string = 'GET',
    body?: unknown,
    requestOrigin = origin,
  ) => {
    return fetch(base + path, {
      method,
      redirect: 'manual',
      headers: { cookie: cookies, Origin: requestOrigin, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  const login = async (id = heroId) => {
    const start = await call('/auth/steam');
    const cookie = start.headers.getSetCookie()[0].split(';')[0];
    const callback = steamCallback(start.headers.get('location')!, id);
    const path = callback.pathname + callback.search;
    assert.equal((await call(path)).headers.get('location'), '/?login=failed');
    const result = await call(path, cookie);
    assert.equal(result.headers.get('location'), '/');
    assert.match(result.headers.getSetCookie()[0], /HttpOnly; Secure; SameSite=Lax/);
    assert.equal((await call(path, cookie)).headers.get('location'), '/?login=failed');

    return result.headers.getSetCookie()[0].split(';')[0];
  };

  const sdk = new Client(base, { headers: { Origin: origin } });
  try {
    const cookies = await login();
    assert.equal((await (await call('/api/account', cookies)).json()).steamName, 'Steam Hero');
    assert.equal((await call('/api/account/ticket', cookies, 'POST')).status, 409);
    assert.equal(
      (
        await call(
          '/api/account/nickname',
          cookies,
          'PATCH',
          { nickname: 'Hero' },
          'https://evil.example',
        )
      ).status,
      403,
    );
    assert.equal(
      (await call('/api/account/nickname', cookies, 'PATCH', { nickname: '\u200b' })).status,
      400,
    );
    assert.equal(
      (await call('/api/account/nickname', cookies, 'PATCH', { nickname: 'Hero' })).status,
      200,
    );
    const friend = await login(friendId);
    await call('/api/account/nickname', friend, 'PATCH', { nickname: 'Friend', steamId: heroId });
    assert.equal(app.runtime.characters.steamAccount(heroId)?.nickname, 'Hero');
    await assert.rejects(
      sdk.create(
        'session',
        { protocolVersion: RUNTIME.protocolVersion, characterToken: 'a'.repeat(64) },
        SessionState,
      ),
    );
    const ticket = (await (await call('/api/account/ticket', cookies, 'POST')).json()).ticket;
    const room = await sdk.create(
      'session',
      { protocolVersion: RUNTIME.protocolVersion, ticket },
      SessionState,
    );
    room.onMessage('event', () => {});
    await assert.rejects(
      sdk.create('session', { protocolVersion: RUNTIME.protocolVersion, ticket }, SessionState),
    );
    const joined = new Promise<{ characterToken: string; world: { players: { name: string }[] } }>(
      (resolve) => {
        return room.onMessage('event', (message) => {
          if (message.type === 'joined') {
            resolve(message);
          }
        });
      },
    );
    room.send('command', {
      type: 'create',
      name: 'Steam world',
      playerName: 'Forged',
      password: '',
      characterToken: 'a'.repeat(64),
    });
    const result = await joined;
    assert.equal(result.characterToken, '');
    assert.equal(result.world.players[0].name, 'Hero');
    const otherLogin = await login();
    const otherTicket = (await (await call('/api/account/ticket', otherLogin, 'POST')).json())
      .ticket;
    const otherRoom = await sdk.create(
      'session',
      { protocolVersion: RUNTIME.protocolVersion, ticket: otherTicket },
      SessionState,
    );
    const rejected = new Promise<string>((resolve) => {
      return otherRoom.onMessage('event', (message) => {
        if (message.type === 'error') {
          resolve(message.message);
        }
      });
    });
    otherRoom.send('command', {
      type: 'create',
      name: 'Takeover',
      playerName: 'Fake',
      password: '',
    });
    assert.match(await rejected, /already playing/);
    await otherRoom.leave();
    // Preserve the method for restoration; this reference is never called unbound.
    // oxlint-disable-next-line typescript/unbound-method
    const rename = app.runtime.characters.renameSteam;
    app.runtime.characters.renameSteam = () => {
      throw new Error('Injected save failure');
    };

    try {
      assert.equal(
        (await call('/api/account/nickname', cookies, 'PATCH', { nickname: 'Lost' })).status,
        400,
      );
      assert.equal(app.runtime.characters.steamAccount(heroId)?.nickname, 'Hero');
      assert(
        [...app.runtime.worlds.values()].some((world) => {
          return [...world.players.values()].some((player) => {
            return player.name === 'Hero';
          });
        }),
      );
    } finally {
      app.runtime.characters.renameSteam = rename;
    }

    await call('/api/account/nickname', cookies, 'PATCH', { nickname: 'Renamed' });
    assert(
      [...app.runtime.worlds.values()].some((world) => {
        return [...world.players.values()].some((player) => {
          return player.name === 'Renamed';
        });
      }),
    );
    const left = new Promise<void>((resolve) => {
      return room.onLeave(() => {
        return resolve();
      });
    });
    assert.equal((await call('/auth/logout', cookies, 'POST')).status, 200);
    await left;
    assert.equal((await call('/api/account/ticket', cookies, 'POST')).status, 401);
    assert.equal((await (await call('/api/account', friend)).json()).nickname, 'Friend');
  } finally {
    await app.close();
  }
});
