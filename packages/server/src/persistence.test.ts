import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { CharacterStore, freshProgress, decodeProgress } from './characters.ts';
import { importLegacy } from './persistence/import-legacy.ts';

test('import CLI defaults to the configured save and prints a restart path without overwriting', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'emberfall-import-cli-'));
  const source = join(dir, 'legacy.sqlite');
  const destination = `${source}.imported.sqlite`;
  const token = 'b'.repeat(64);
  const legacy = new DatabaseSync(source);
  legacy.exec('CREATE TABLE characters (id TEXT, token_hash TEXT, name TEXT, progress TEXT)');
  legacy
    .prepare('INSERT INTO characters VALUES (?, ?, ?, ?)')
    .run(
      'cli-hero',
      createHash('sha256').update(token).digest('hex'),
      'Hero',
      JSON.stringify({ ...freshProgress(), experience: 12.5 }),
    );
  legacy.close();
  const before = readFileSync(source);
  const script = fileURLToPath(new URL('../scripts/import-save.ts', import.meta.url));
  const server = fileURLToPath(new URL('../', import.meta.url));
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: dir,
      env: { ...process.env, SAVE_PATH_NEW: relative(server, source) },
      encoding: 'utf8',
    });
  try {
    const imported = run();
    assert.equal(imported.status, 0, imported.stderr);
    const setting = imported.stdout
      .split(/\r?\n/)
      .find((line) => line.startsWith('SAVE_PATH_NEW='))!;
    const configured = parseEnv(setting).SAVE_PATH_NEW;
    assert(configured);
    assert.equal(resolve(configured), destination);
    assert.deepEqual(readFileSync(source), before);
    const store = new CharacterStore(destination);
    await store.ready;
    try {
      assert.equal(store.load(token).progress.experience, 12.5);
    } finally {
      store.close();
    }

    const saved = readFileSync(destination);
    const repeated = run();
    assert.equal(repeated.status, 1);
    assert.match(repeated.stderr, /already exists/);
    assert.deepEqual(readFileSync(destination), saved);
    const explicit = run(source, join(dir, 'explicit.sqlite'));
    assert.equal(explicit.status, 0, explicit.stderr);
    const invalid = run(source);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /Usage:/);
    assert.doesNotMatch(invalid.stderr, /at file:/);
    const missing = run(join(dir, 'missing.sqlite'), join(dir, 'missing-target.sqlite'));
    assert.equal(missing.status, 1);
    assert(!existsSync(join(dir, 'missing-target.sqlite')));
    assert.deepEqual(readFileSync(source), before);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('save revisions reject stale writers and interoperate with Colyseus cloud saves', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'emberfall-new-cas-'));
  const first = new CharacterStore(join(dir, 'new.sqlite'));
  await first.ready;
  const second = new CharacterStore(join(dir, 'new.sqlite'));
  await second.ready;
  try {
    const hero = first.create('Hero');
    second.load(hero.token);
    first.save(hero.id, 'Renamed', { ...hero.progress, experience: 21 });
    assert.throws(() => second.save(hero.id, 'Stale', hero.progress), /Version conflict/);
    assert.equal(second.load(hero.token).name, 'Renamed');
    const save = (await first.database.saves.load(hero.id))!;
    assert.equal(save.version, 2);
    assert.equal(decodeProgress(JSON.stringify(save.data)).progress.experience, 21);
    const slots = await first.database.saves.listSlots(hero.id);
    assert(Math.abs(slots[0].updatedAt.getTime() - Date.now()) < 2000);
    await first.database.saves.save(hero.id, save.data, 0, save.version);
    assert.throws(() => first.save(hero.id, 'Stale again', hero.progress), /Version conflict/);
    assert.throws(() => decodeProgress('{"formatVersion":999}'), /Unsupported/);
  } finally {
    second.close();
    first.close();
    rmSync(dir, { recursive: true });
  }
});

test('legacy backup import preserves progress and identity without altering or overwriting either source', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'emberfall-new-import-'));
  const source = join(dir, 'backup.sqlite'),
    target = join(dir, 'new.sqlite');
  const token = 'a'.repeat(64),
    hash = createHash('sha256').update(token).digest('hex');
  const legacy = new DatabaseSync(source);
  legacy.exec('CREATE TABLE characters (id TEXT, token_hash TEXT, name TEXT, progress TEXT)');
  legacy
    .prepare('INSERT INTO characters VALUES (?, ?, ?, ?)')
    .run('p', hash, 'Original', JSON.stringify({ ...freshProgress(), experience: 87 }));
  legacy.close();
  const before = readFileSync(source);
  try {
    assert.throws(() => new CharacterStore(source), /Legacy database/);
    assert.deepEqual(await importLegacy(source, target), { characters: 1, worlds: 0 });
    assert.deepEqual(readFileSync(source), before);
    const store = new CharacterStore(target);
    await store.ready;
    try {
      assert.equal(store.load(token).progress.experience, 87);
    } finally {
      store.close();
    }

    await assert.rejects(importLegacy(source, target), /already exists/);
    await assert.rejects(importLegacy(source, source), /must differ/);
    const bad = new DatabaseSync(source);
    bad.prepare('UPDATE characters SET progress=?').run('{"formatVersion":999}');
    bad.close();
    await assert.rejects(importLegacy(source, join(dir, 'bad.sqlite')), /Unsupported/);
    assert(
      !existsSync(join(dir, 'bad.sqlite')),
      'failed imports never publish a partial destination',
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});
