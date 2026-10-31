import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SteamProvider } from './steam.ts';
import { CharacterStore } from './characters.ts';

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
