import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@colyseus/sdk';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { SessionState } from '@emberfall/common/protocol';
import { SteamProvider } from './steam.ts';
import { CharacterStore } from './characters.ts';
import { createGameServer } from './worlds.ts';
import { Accounts } from './accounts.ts';
import { Peer } from './network/peer.ts';
import { steamRequest, steamCallback, heroId, friendId } from './testing/steam.ts';

test('Steam verifier rejects forged, wrong-site, unsigned, stale and replayed assertions', async () => {
  const provider = new SteamProvider('test', steamRequest);
  const returnTo = 'https://game.example/auth/steam/callback?state=test';
  const callback = () => steamCallback(provider.loginUrl(returnTo)).searchParams;
  const valid = callback();
  assert.equal(await provider.verify(valid, returnTo), heroId);
  await assert.rejects(provider.verify(valid, returnTo));
  const cases: [string, string][] = [
    ['openid.return_to', 'https://attacker.example/'],
    ['openid.op_endpoint', 'https://attacker.example/'],
    ['openid.identity', `https://steamcommunity.com/openid/id/${friendId}`],
    ['openid.signed', 'claimed_id,identity,response_nonce'],
    ['openid.sig', 'forged'],
    ['openid.mode', 'cancel'],
    ['openid.response_nonce', '2000-01-01T00:00:00Zold'],
  ];
  for (const [key, value] of cases) {
    const query = callback();
    query.set(key, value);
    await assert.rejects(provider.verify(query, returnTo), { name: 'Error' }, key);
  }
  const duplicate = callback();
  duplicate.append('openid.claimed_id', valid.get('openid.claimed_id')!);
  await assert.rejects(provider.verify(duplicate, returnTo));
  const simultaneous = callback();
  const results = await Promise.allSettled([
    provider.verify(simultaneous, returnTo),
    provider.verify(simultaneous, returnTo),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
});

test('Steam persistence preserves legacy saves, account identity and nickname across restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'emberfall-accounts-'));
  const path = join(dir, 'accounts.sqlite');
  let store = new CharacterStore(path);
  await store.ready;
  try {
    const legacy = store.create('Old hero');
    store.save(legacy.id, legacy.name, { ...legacy.progress, experience: 73 });
    const account = store.loginSteam(heroId, 'Steam Hero');
    assert.notEqual(account.characterId, legacy.id);
    assert.equal(account.nickname, null);
    store.renameSteam(heroId, 'Game Hero');
    const character = store.loadById(account.characterId);
    store.save(character.id, 'Stale name', { ...character.progress, experience: 25 });
    const token = store.createSession(heroId, Date.now() + 60_000);
    const expired = store.createSession(heroId, Date.now() - 1);
    assert.equal(store.session(expired), undefined);
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    assert.equal(store.session(token)?.nickname, 'Game Hero');
    assert.equal(store.loginSteam(heroId, 'New Steam Name').characterId, character.id);
    assert.equal(store.steamAccount(heroId)?.nickname, 'Game Hero');
    assert.equal(store.loadById(character.id).progress.experience, 25);
    assert.equal(store.loadById(character.id).name, 'Game Hero');
    assert.equal(store.load(legacy.token).progress.experience, 73);
    assert.equal(store.load(legacy.token).name, 'Old hero');
    store.revokeSession(token);
    assert.equal(store.session(token), undefined);
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});

test(
  'idle game peers are disconnected when their account session expires',
  { timeout: 3000 },
  async () => {
    const store = new CharacterStore(':memory:');
    await store.ready;
    const accounts = new Accounts(
      store,
      { origin: 'https://game.example', apiKey: 'test', request: steamRequest },
      () => {},
    );
    try {
      store.loginSteam(heroId, 'Hero');
      store.renameSteam(heroId, 'Hero');
      const token = store.createSession(heroId, Date.now() + 40);
      const peer = new Peer(
        () => {},
        () => {},
      );
      const closed = new Promise<number>((resolve) => peer.once('close', resolve));
      accounts.attach(peer, token);
      assert.equal(await closed, 1008);
      assert.equal(store.session(token), undefined);
    } finally {
      accounts.close();
      store.close();
    }
  },
);

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
  ) =>
    fetch(base + path, {
      method,
      redirect: 'manual',
      headers: { cookie: cookies, Origin: requestOrigin, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
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
      (resolve) =>
        room.onMessage('event', (message) => {
          if (message.type === 'joined') resolve(message);
        }),
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
    const rejected = new Promise<string>((resolve) =>
      otherRoom.onMessage('event', (message) => {
        if (message.type === 'error') resolve(message.message);
      }),
    );
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
        [...app.runtime.worlds.values()].some((world) =>
          [...world.players.values()].some((player) => player.name === 'Hero'),
        ),
      );
    } finally {
      app.runtime.characters.renameSteam = rename;
    }
    await call('/api/account/nickname', cookies, 'PATCH', { nickname: 'Renamed' });
    assert(
      [...app.runtime.worlds.values()].some((world) =>
        [...world.players.values()].some((player) => player.name === 'Renamed'),
      ),
    );
    const left = new Promise<void>((resolve) => room.onLeave(() => resolve()));
    assert.equal((await call('/auth/logout', cookies, 'POST')).status, 200);
    await left;
    assert.equal((await call('/api/account/ticket', cookies, 'POST')).status, 401);
    assert.equal((await (await call('/api/account', friend)).json()).nickname, 'Friend');
  } finally {
    await app.close();
  }
});

test('Pages client uses credentialed accounts, client redirects and origin-bound SDK tickets', async () => {
  const origin = 'https://api.example';
  const clientUrl = 'https://player.github.io/emberfall/';
  const clientOrigin = new URL(clientUrl).origin;
  const app = await createGameServer(undefined, ':memory:', undefined, {
    origin,
    clientUrl,
    apiKey: 'test',
    request: steamRequest,
  });
  await app.listen(0);
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const call = (path: string, init: RequestInit = {}) =>
    fetch(base + path, { redirect: 'manual', ...init });
  try {
    const preflight = await call('/api/account/nickname', {
      method: 'OPTIONS',
      headers: {
        Origin: clientOrigin,
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), clientOrigin);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    assert.match(preflight.headers.get('access-control-allow-methods')!, /PATCH/);
    const start = await call('/auth/steam');
    const callback = steamCallback(start.headers.get('location')!, heroId);
    assert.equal(callback.origin, origin);
    const path = callback.pathname + callback.search;
    const failed = await call(path);
    assert.equal(failed.headers.get('location'), `${clientUrl}?login=failed`);
    const login = await call(path, {
      headers: { Cookie: start.headers.getSetCookie()[0].split(';')[0] },
    });
    assert.equal(login.headers.get('location'), clientUrl);
    assert.match(login.headers.getSetCookie()[0], /HttpOnly; Secure; SameSite=None/);
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    const headers = { Origin: clientOrigin, Cookie: cookie, 'Content-Type': 'application/json' };
    const account = await call('/api/account', { headers });
    assert.equal(account.headers.get('access-control-allow-origin'), clientOrigin);
    assert.equal((await account.json()).authenticated, true);
    for (const untrusted of ['https://evil.example', origin]) {
      const denied = await call('/api/account', { headers: { ...headers, Origin: untrusted } });
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get('access-control-allow-origin'), null);
      assert.equal(
        (
          await call('/api/account/nickname', {
            method: 'PATCH',
            headers: { ...headers, Origin: untrusted },
            body: JSON.stringify({ nickname: 'Forged' }),
          })
        ).status,
        403,
      );
    }
    assert.equal(
      (
        await call('/api/account/nickname', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ nickname: 'Pages Hero' }),
        })
      ).status,
      200,
    );
    const { ticket } = await (
      await call('/api/account/ticket', { method: 'POST', headers })
    ).json();
    await assert.rejects(
      new Client(base, { headers: { Origin: origin } }).create(
        'session',
        { protocolVersion: RUNTIME.protocolVersion, ticket },
        SessionState,
      ),
    );
    const room = await new Client(base, { headers: { Origin: clientOrigin } }).create(
      'session',
      { protocolVersion: RUNTIME.protocolVersion, ticket },
      SessionState,
    );
    await room.leave();
    const logout = await call('/auth/logout', { method: 'POST', headers });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.getSetCookie()[0], /SameSite=None; Max-Age=0/);
    assert.equal((await (await call('/api/account', { headers })).json()).authenticated, false);
  } finally {
    await app.close();
  }
});
