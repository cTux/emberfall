import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/node-sqlite";
import { getTableName } from "drizzle-orm";
import { GameDatabase, VersionConflictError } from "@colyseus/database";
import {
  progressSchema,
  classSchema,
  CLASS_IDS,
  starterEquipment,
  validateClassEquipment,
  syncEquipmentVitals,
} from "@emberfall/common-new";
import { INITIAL_PROGRESS } from "@emberfall/common-new/definitions/entities/players";
import type { CharacterProgress, ClassId, Player } from "@emberfall/common-new";

export const freshProgress = (classId?: ClassId): CharacterProgress => ({
  ...structuredClone(INITIAL_PROGRESS),
  ...(classId ? { equipment: starterEquipment(classId) } : {}),
});
function classProgress(value: unknown, classId: ClassId): CharacterProgress {
  const progress = progressSchema.parse(value);
  progress.equipment = validateClassEquipment(
    progress.equipment ?? starterEquipment(classId),
    classId,
  );
  const derived = { ...progress, classId } as Player;
  syncEquipmentVitals(derived);
  return progressSchema.parse(derived);
}
export function decodeProgress(raw: string) {
  const data = JSON.parse(raw);
  if (data.formatVersion !== undefined && data.formatVersion !== 1)
    throw new Error("Unsupported save format");
  const classId: ClassId = data.classes ? classSchema.parse(data.classId) : "warrior";
  const classes = Object.fromEntries(
    CLASS_IDS.map((id) => [
      id,
      classProgress(
        data.classes?.[id] ?? (id === "warrior" && !data.classes ? data : freshProgress(id)),
        id,
      ),
    ]),
  ) as Record<ClassId, CharacterProgress>;
  return { classId, classes, progress: classes[classId] };
}

/** SQLite's synchronous transaction keeps identity and Colyseus save rows atomic.
 * Await ready before use. Cloud-save revisions interoperate with database.saves.
 */
export class CharacterStore {
  private db: DatabaseSync;
  readonly database: GameDatabase;
  readonly ready: Promise<void>;
  private versions = new Map<string, number>();
  private get savesTable() {
    return getTableName(this.database.tables.cloudSaves);
  }
  private get usersTable() {
    return getTableName(this.database.tables.users);
  }
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    if (
      this.db
        .prepare("PRAGMA table_info(characters)")
        .all()
        .some((column) => column.name === "progress")
    ) {
      this.db.close();
      throw new Error(
        "Legacy database detected. Use import-save-new with a backup and a separate destination.",
      );
    }
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
    this.database = new GameDatabase({ db: drizzle({ client: this.db }), dialect: "sqlite" });
    this.ready = this.database
      .boot()
      .then(() => {
        this.db.exec(`CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, updated_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS worlds (id TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT, permanent INTEGER NOT NULL DEFAULT 0) STRICT;
      CREATE TABLE IF NOT EXISTS world_members (character_id TEXT PRIMARY KEY REFERENCES characters(id), world_id TEXT NOT NULL REFERENCES worlds(id)) STRICT;
      CREATE TABLE IF NOT EXISTS emberfall_migrations (version INTEGER PRIMARY KEY) STRICT;
      INSERT OR IGNORE INTO emberfall_migrations VALUES (1);`);
        this.db.exec(`CREATE TABLE IF NOT EXISTS steam_accounts (
          steam_id TEXT PRIMARY KEY, character_id TEXT UNIQUE NOT NULL REFERENCES characters(id),
          nickname TEXT, steam_name TEXT NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS account_sessions (
          token_hash TEXT PRIMARY KEY, steam_id TEXT NOT NULL REFERENCES steam_accounts(steam_id),
          expires_at INTEGER NOT NULL
        ) STRICT;`);
      })
      .catch((error) => {
        this.close();
        throw error;
      });
  }
  worlds() {
    return this.db
      .prepare("SELECT * FROM worlds")
      .all()
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        salt: String(row.salt),
        hash: row.hash ? Buffer.from(String(row.hash), "hex") : undefined,
        permanent: !!row.permanent,
      }));
  }
  saveWorld(world: { id: string; name: string; salt: string; hash?: Buffer }, permanent = false) {
    this.db
      .prepare(
        "INSERT INTO worlds VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, salt=excluded.salt, hash=excluded.hash, permanent=excluded.permanent",
      )
      .run(
        world.id,
        world.name,
        world.salt,
        world.hash?.toString("hex") ?? null,
        Number(permanent),
      );
  }
  deleteWorld(id: string) {
    this.transaction(() => {
      this.db.prepare("DELETE FROM world_members WHERE world_id = ?").run(id);
      this.db.prepare("DELETE FROM worlds WHERE id = ?").run(id);
    });
  }
  rememberWorld(characterId: string, worldId: string) {
    this.db
      .prepare(
        "INSERT INTO world_members VALUES (?, ?) ON CONFLICT(character_id) DO UPDATE SET world_id=excluded.world_id",
      )
      .run(characterId, worldId);
  }
  forgetWorld(characterId: string) {
    this.db.prepare("DELETE FROM world_members WHERE character_id = ?").run(characterId);
  }
  canResume(characterId: string, worldId: string) {
    return !!this.db
      .prepare("SELECT 1 FROM world_members WHERE character_id = ? AND world_id = ?")
      .get(characterId, worldId);
  }
  load(token: string) {
    const hash = createHash("sha256").update(token).digest("hex");
    const identity = this.db.prepare("SELECT id FROM characters WHERE token_hash=?").get(hash);
    if (!identity) throw new Error("Character save not found.");
    return this.loadById(String(identity.id));
  }
  loadById(id: string) {
    const row = this.db
      .prepare(
        `SELECT c.id, c.name, s.data, s.version FROM characters c JOIN ${this.savesTable} s ON s.user_id=c.id AND s.slot=0 WHERE c.id=?`,
      )
      .get(id);
    if (!row)
      throw new Error(
        "Character save not found. Check that you are connected to the correct server.",
      );
    const result = decodeProgress(String(row.data));
    this.versions.set(String(row.id), Number(row.version));
    return { id: String(row.id), name: String(row.name), ...result };
  }
  create(name: string) {
    const token = randomBytes(32).toString("hex"),
      id = randomUUID();
    this.importCharacter(
      id,
      createHash("sha256").update(token).digest("hex"),
      name,
      JSON.stringify(freshProgress()),
    );
    return { token, ...this.load(token) };
  }
  importCharacter(id: string, tokenHash: string, name: string, raw: string) {
    const { classId, classes } = decodeProgress(raw);
    if (this.db.prepare("SELECT 1 FROM characters WHERE id=? OR token_hash=?").get(id, tokenHash))
      throw new Error("Character already exists; refusing to overwrite progress");
    this.transaction(() => {
      const now = Math.floor(Date.now() / 1000);
      this.db
        .prepare(
          `INSERT INTO ${this.usersTable} (id, anonymous, created_at, updated_at) VALUES (?, 1, ?, ?)`,
        )
        .run(id, now, now);
      this.db.prepare("INSERT INTO characters VALUES (?, ?, ?, ?)").run(id, tokenHash, name, now);
      this.db
        .prepare(
          `INSERT INTO ${this.savesTable} (user_id, slot, version, data, created_at, updated_at) VALUES (?, 0, 1, ?, ?, ?)`,
        )
        .run(id, JSON.stringify({ formatVersion: 1, classId, classes }), now, now);
    });
    this.versions.set(id, 1);
  }
  save(
    id: string,
    name: string,
    progress: CharacterProgress & Partial<Pick<Player, "classId" | "classes">>,
  ) {
    const row = this.db
      .prepare(`SELECT data, version FROM ${this.savesTable} WHERE user_id=? AND slot=0`)
      .get(id);
    if (!row) throw new Error("Character save is missing.");
    const previous = decodeProgress(String(row.data));
    const classId = classSchema.parse(progress.classId ?? previous.classId);
    const classes = {
      ...previous.classes,
      ...progress.classes,
      [classId]: progressSchema.parse(progress),
    };
    for (const id of CLASS_IDS) classes[id] = classProgress(classes[id], id);
    const version = this.versions.get(id) ?? Number(row.version);
    this.transaction(() => {
      const result = this.db
        .prepare(
          `UPDATE ${this.savesTable} SET data=?, version=version+1, updated_at=? WHERE user_id=? AND slot=0 AND version=?`,
        )
        .run(
          JSON.stringify({ formatVersion: 1, classId, classes }),
          Math.floor(Date.now() / 1000),
          id,
          version,
        );
      if (!result.changes) throw new VersionConflictError(id, 0, version);
      this.db
        .prepare(
          "UPDATE characters SET name=COALESCE((SELECT nickname FROM steam_accounts WHERE character_id=characters.id), ?), updated_at=? WHERE id=?",
        )
        .run(name, Date.now(), id);
    });
    this.versions.set(id, version + 1);
  }
  selectClass(id: string, player: Player, classId: ClassId) {
    const previousId = player.classId ?? "warrior";
    const classes = { ...player.classes, [previousId]: progressSchema.parse(player) } as Record<
      ClassId,
      CharacterProgress
    >;
    const next = classProgress(classes[classId] ?? freshProgress(classId), classId);
    const updated = {
      ...player,
      ...next,
      classId,
      classes,
      talents: next.talents ?? {},
      attackAt: undefined,
      attackAngle: undefined,
      bear: undefined,
    };
    this.save(id, player.name, updated);
    Object.assign(player, updated);
  }
  steamAccount(steamId: string) {
    const row = this.db.prepare("SELECT * FROM steam_accounts WHERE steam_id=?").get(steamId);
    if (!row) return undefined;
    return {
      steamId,
      characterId: String(row.character_id),
      nickname: row.nickname === null ? null : String(row.nickname),
      steamName: String(row.steam_name),
    };
  }
  loginSteam(steamId: string, steamName: string) {
    return this.transaction(() => {
      if (!this.steamAccount(steamId)) {
        const character = this.create("Wanderer");
        this.db
          .prepare("INSERT INTO steam_accounts VALUES (?, ?, NULL, ?)")
          .run(steamId, character.id, steamName);
      } else if (steamName) {
        this.db
          .prepare("UPDATE steam_accounts SET steam_name=? WHERE steam_id=?")
          .run(steamName, steamId);
      }
      return this.steamAccount(steamId)!;
    });
  }
  renameSteam(steamId: string, nickname: string) {
    return this.transaction(() => {
      const account = this.steamAccount(steamId);
      if (!account) throw new Error("Account not found");
      this.db
        .prepare("UPDATE steam_accounts SET nickname=? WHERE steam_id=?")
        .run(nickname, steamId);
      this.db
        .prepare("UPDATE characters SET name=?, updated_at=? WHERE id=?")
        .run(nickname, Date.now(), account.characterId);
      return this.steamAccount(steamId)!;
    });
  }
  createSession(steamId: string, expiresAt: number) {
    const token = randomBytes(32).toString("hex");
    this.db.prepare("DELETE FROM account_sessions WHERE expires_at<=?").run(Date.now());
    this.db
      .prepare("INSERT INTO account_sessions VALUES (?, ?, ?)")
      .run(createHash("sha256").update(token).digest("hex"), steamId, expiresAt);
    return token;
  }
  session(token: string) {
    const row = this.db
      .prepare("SELECT steam_id FROM account_sessions WHERE token_hash=? AND expires_at>?")
      .get(createHash("sha256").update(token).digest("hex"), Date.now());
    return row ? this.steamAccount(String(row.steam_id)) : undefined;
  }
  revokeSession(token: string) {
    this.db
      .prepare("DELETE FROM account_sessions WHERE token_hash=?")
      .run(createHash("sha256").update(token).digest("hex"));
  }
  private transactionId = 0;
  private transaction<T>(operation: () => T): T {
    const savepoint = `operation_${++this.transactionId}`;
    this.db.exec(`SAVEPOINT ${savepoint}`);
    try {
      const result = operation();
      this.db.exec(`RELEASE ${savepoint}`);
      return result;
    } catch (error) {
      this.db.exec(`ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
      throw error;
    }
  }
  close() {
    if (this.db.isOpen) this.db.close();
  }
}
