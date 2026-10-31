import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getTableName } from 'drizzle-orm';
import { CharacterStore } from './characters.ts';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'emberfall-repositories-'));
  const path = join(directory, 'characters.sqlite');
  const store = new CharacterStore(path);
  await store.ready;
  const db = new DatabaseSync(path);
  t.after(() => {
    db.close();
    store.close();
    rmSync(directory, { recursive: true });
  });

  return { store, db };
}

test('account creation rolls nested character and cloud-save writes back on the same connection', async (t) => {
  const { store, db } = await fixture(t);
  db.exec(`CREATE TRIGGER reject_account BEFORE INSERT ON steam_accounts
    BEGIN SELECT RAISE(ABORT, 'account blocked'); END;`);
  assert.throws(() => {
    return store.loginSteam('hero', 'Hero');
  }, /account blocked/);
  for (const table of [
    'characters',
    getTableName(store.database.tables.users),
    getTableName(store.database.tables.cloudSaves),
  ]) {
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count, 0, table);
  }

  assert.equal(store.steamAccount('hero'), undefined);
  db.exec('DROP TRIGGER reject_account');
  const account = store.loginSteam('hero', 'Hero');
  assert.equal(store.loadById(account.characterId).name, 'Wanderer');
});

test('failed character rename rolls the account nickname back before a successful retry', async (t) => {
  const { store, db } = await fixture(t);
  const account = store.loginSteam('hero', 'Hero');
  db.exec(`CREATE TRIGGER reject_rename BEFORE UPDATE ON characters
    BEGIN SELECT RAISE(ABORT, 'rename blocked'); END;`);
  assert.throws(() => {
    return store.renameSteam('hero', 'Renamed');
  }, /rename blocked/);
  assert.equal(store.steamAccount('hero')!.nickname, null);
  assert.equal(store.loadById(account.characterId).name, 'Wanderer');
  db.exec('DROP TRIGGER reject_rename');
  store.renameSteam('hero', 'Renamed');
  assert.equal(store.steamAccount('hero')!.nickname, 'Renamed');
  assert.equal(store.loadById(account.characterId).name, 'Renamed');
});

test('failed world removal retains membership and merchant stock; retry removes both', async (t) => {
  const { store, db } = await fixture(t);
  const hero = store.create('Hero');
  store.saveWorld({ id: 'world', name: 'World', salt: '' });
  store.rememberWorld(hero.id, 'world');
  const merchant = store.merchant('world');
  db.exec(`CREATE TRIGGER reject_world BEFORE DELETE ON worlds
    BEGIN SELECT RAISE(ABORT, 'world blocked'); END;`);
  assert.throws(() => {
    return store.deleteWorld('world');
  }, /world blocked/);
  assert.equal(store.canResume(hero.id, 'world'), true);
  assert.equal(store.worlds().length, 1);
  assert.deepEqual(store.merchant('world'), merchant);
  db.exec('DROP TRIGGER reject_world');
  store.deleteWorld('world');
  assert.equal(store.canResume(hero.id, 'world'), false);
  assert.deepEqual(store.worlds(), []);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM merchants').get()!.count, 0);
});
