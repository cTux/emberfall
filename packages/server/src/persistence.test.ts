import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { CharacterStore, freshProgress, decodeProgress } from "./characters.ts";
import { importLegacy } from "./persistence/import-legacy.ts";

test("save revisions reject stale writers and interoperate with Colyseus cloud saves", async () => {
  const dir = mkdtempSync(join(tmpdir(), "emberfall-new-cas-"));
  const first = new CharacterStore(join(dir, "new.sqlite"));
  await first.ready;
  const second = new CharacterStore(join(dir, "new.sqlite"));
  await second.ready;
  try {
    const hero = first.create("Hero");
    second.load(hero.token);
    first.save(hero.id, "Renamed", { ...hero.progress, experience: 21 });
    assert.throws(() => second.save(hero.id, "Stale", hero.progress), /Version conflict/);
    assert.equal(second.load(hero.token).name, "Renamed");
    const save = (await first.database.saves.load(hero.id))!;
    assert.equal(save.version, 2);
    assert.equal(decodeProgress(JSON.stringify(save.data)).progress.experience, 21);
    const slots = await first.database.saves.listSlots(hero.id);
    assert(Math.abs(slots[0].updatedAt.getTime() - Date.now()) < 2000);
    await first.database.saves.save(hero.id, save.data, 0, save.version);
    assert.throws(() => first.save(hero.id, "Stale again", hero.progress), /Version conflict/);
    assert.throws(() => decodeProgress('{"formatVersion":999}'), /Unsupported/);
  } finally {
    second.close();
    first.close();
    rmSync(dir, { recursive: true });
  }
});

test("legacy backup import preserves progress and identity without altering or overwriting either source", async () => {
  const dir = mkdtempSync(join(tmpdir(), "emberfall-new-import-"));
  const source = join(dir, "backup.sqlite"),
    target = join(dir, "new.sqlite");
  const token = "a".repeat(64),
    hash = createHash("sha256").update(token).digest("hex");
  const legacy = new DatabaseSync(source);
  legacy.exec("CREATE TABLE characters (id TEXT, token_hash TEXT, name TEXT, progress TEXT)");
  legacy
    .prepare("INSERT INTO characters VALUES (?, ?, ?, ?)")
    .run("p", hash, "Original", JSON.stringify({ ...freshProgress(), experience: 87 }));
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
    bad.prepare("UPDATE characters SET progress=?").run('{"formatVersion":999}');
    bad.close();
    await assert.rejects(importLegacy(source, join(dir, "bad.sqlite")), /Unsupported/);
    assert(
      !existsSync(join(dir, "bad.sqlite")),
      "failed imports never publish a partial destination",
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});
