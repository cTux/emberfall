import { DatabaseSync } from "node:sqlite";
import { constants, copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { CharacterStore, decodeProgress } from "../characters.ts";

/** Import an offline backup into a new database. No target is published until
 * every record validates and commits; existing destinations are never replaced.
 */
export async function importLegacy(sourcePath: string, destinationPath: string) {
  const source = resolve(sourcePath),
    destination = resolve(destinationPath);
  if (source.toLowerCase() === destination.toLowerCase())
    throw new Error("Source and destination must differ");
  if (existsSync(destination))
    throw new Error("Destination already exists; refusing to overwrite it");
  const legacy = new DatabaseSync(source, { readOnly: true });
  let store: CharacterStore | undefined;
  const temporary = `${destination}.import-${randomUUID()}.sqlite`;
  try {
    legacy.exec("PRAGMA query_only=ON");
    const characters = legacy
      .prepare("SELECT id, token_hash, name, progress FROM characters")
      .all();
    for (const row of characters) {
      if (
        typeof row.id !== "string" ||
        typeof row.name !== "string" ||
        !/^[a-f0-9]{64}$/.test(String(row.token_hash))
      )
        throw new Error("Invalid legacy character identity");
      decodeProgress(String(row.progress));
    }
    const hasTable = (name: string) =>
      !!legacy.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
    const worlds = hasTable("worlds") ? legacy.prepare("SELECT * FROM worlds").all() : [];
    const members = hasTable("world_members")
      ? legacy.prepare("SELECT * FROM world_members").all()
      : [];
    mkdirSync(dirname(destination), { recursive: true });
    store = new CharacterStore(temporary);
    await store.ready;
    for (const row of characters)
      store.importCharacter(
        String(row.id),
        String(row.token_hash),
        String(row.name),
        String(row.progress),
      );
    for (const row of worlds)
      store.saveWorld(
        {
          id: String(row.id),
          name: String(row.name),
          salt: String(row.salt),
          hash: row.hash ? Buffer.from(String(row.hash), "hex") : undefined,
        },
        !!row.permanent,
      );
    for (const row of members) store.rememberWorld(String(row.character_id), String(row.world_id));
    store.close();
    copyFileSync(temporary, destination, constants.COPYFILE_EXCL);
    return { characters: characters.length, worlds: worlds.length };
  } finally {
    legacy.close();
    store?.close();
    for (const suffix of ["", "-wal", "-shm"]) rmSync(temporary + suffix, { force: true });
  }
}
