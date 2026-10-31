import type { DatabaseSync } from 'node:sqlite';

export function createWorldRepository(db: DatabaseSync, transaction: <T>(operation: () => T) => T) {
  function worlds() {
    return db
      .prepare('SELECT * FROM worlds')
      .all()
      .map((row) => {
        return {
          id: String(row.id),
          name: String(row.name),
          salt: String(row.salt),
          hash: row.hash ? Buffer.from(String(row.hash), 'hex') : undefined,
          permanent: !!row.permanent,
        };
      });
  }

  function saveWorld(
    world: { id: string; name: string; salt: string; hash?: Buffer },
    permanent = false,
  ) {
    db.prepare(
      'INSERT INTO worlds VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, salt=excluded.salt, hash=excluded.hash, permanent=excluded.permanent',
    ).run(world.id, world.name, world.salt, world.hash?.toString('hex') ?? null, Number(permanent));
  }

  function deleteWorld(id: string) {
    transaction(() => {
      db.prepare('DELETE FROM world_members WHERE world_id = ?').run(id);
      db.prepare('DELETE FROM worlds WHERE id = ?').run(id);
    });
  }

  function rememberWorld(characterId: string, worldId: string) {
    db.prepare(
      'INSERT INTO world_members VALUES (?, ?) ON CONFLICT(character_id) DO UPDATE SET world_id=excluded.world_id',
    ).run(characterId, worldId);
  }

  function forgetWorld(characterId: string) {
    db.prepare('DELETE FROM world_members WHERE character_id = ?').run(characterId);
  }

  function canResume(characterId: string, worldId: string) {
    return !!db
      .prepare('SELECT 1 FROM world_members WHERE character_id = ? AND world_id = ?')
      .get(characterId, worldId);
  }

  return { worlds, saveWorld, deleteWorld, rememberWorld, forgetWorld, canResume };
}
