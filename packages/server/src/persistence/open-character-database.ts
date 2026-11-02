import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openCharacterDatabase(path: string) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);

  if (
    db
      .prepare('PRAGMA table_info(characters)')
      .all()
      .some((column) => {
        return column.name === 'progress';
      })
  ) {
    db.close();

    throw new Error(
      'Legacy database detected. Stop the server and back up the database, then run pnpm import-save from the repository root. It writes a separate database and prints the SAVE_PATH_NEW setting needed before restarting. To choose paths explicitly: pnpm import-save <legacy-backup.sqlite> <new-destination.sqlite>.',
    );
  }

  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');

  return db;
}
