import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@colyseus/sdk';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { SessionState } from '@emberfall/common/protocol';

import { createGameServer } from './worlds.ts';

import { steamRequest, steamCallback, heroId } from './testing/steam.ts';

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
  const call = (path: string, init: RequestInit = {}) => {
    return fetch(base + path, { redirect: 'manual', ...init });
  };

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
          body: JSON.stringify({ nickname: 'Pages_Hero' }),
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
