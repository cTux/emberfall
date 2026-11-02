import type { DatabaseSync } from 'node:sqlite';

export function initializeCharacterTables(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, updated_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS worlds (id TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT, permanent INTEGER NOT NULL DEFAULT 0) STRICT;
      CREATE TABLE IF NOT EXISTS world_members (character_id TEXT PRIMARY KEY REFERENCES characters(id), world_id TEXT NOT NULL REFERENCES worlds(id)) STRICT;
      CREATE TABLE IF NOT EXISTS emberfall_migrations (version INTEGER PRIMARY KEY) STRICT;
      INSERT OR IGNORE INTO emberfall_migrations VALUES (1);`);
  db.exec(`CREATE TABLE IF NOT EXISTS merchants (world_id TEXT PRIMARY KEY REFERENCES worlds(id) ON DELETE CASCADE, data TEXT NOT NULL) STRICT;
        CREATE TABLE IF NOT EXISTS steam_accounts (
          steam_id TEXT PRIMARY KEY, character_id TEXT UNIQUE NOT NULL REFERENCES characters(id),
          nickname TEXT, steam_name TEXT NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS account_sessions (
          token_hash TEXT PRIMARY KEY, steam_id TEXT NOT NULL REFERENCES steam_accounts(steam_id),
          expires_at INTEGER NOT NULL
        ) STRICT;`);
}
