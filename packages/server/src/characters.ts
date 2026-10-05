import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { progressSchema, classSchema, CLASS_IDS } from "@emberfall/common";
import type { CharacterProgress, ClassId, Player } from "@emberfall/common";

export const freshProgress = (): CharacterProgress => ({
  level: 1,
  experience: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  playtimeSeconds: 0,
  talents: {},
});
function decode(raw: string) {
  const data = JSON.parse(raw);
  const classId: ClassId = data.classes ? classSchema.parse(data.classId) : "warrior";
  const classes = Object.fromEntries(
    CLASS_IDS.map((id) => [
      id,
      progressSchema.parse(
        data.classes?.[id] ?? (id === "warrior" && !data.classes ? data : freshProgress()),
      ),
    ]),
  ) as Record<ClassId, CharacterProgress>;
  return { classId, classes, progress: classes[classId] };
}

export class CharacterStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        progress TEXT NOT NULL, updated_at INTEGER NOT NULL
      ) STRICT;`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT,
      permanent INTEGER NOT NULL DEFAULT 0
    ) STRICT;
    CREATE TABLE IF NOT EXISTS world_members (
      character_id TEXT PRIMARY KEY, world_id TEXT NOT NULL
    ) STRICT;`);
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
      .prepare("INSERT OR REPLACE INTO worlds VALUES (?, ?, ?, ?, ?)")
      .run(
        world.id,
        world.name,
        world.salt,
        world.hash?.toString("hex") ?? null,
        Number(permanent),
      );
  }
  deleteWorld(id: string) {
    this.db.prepare("DELETE FROM world_members WHERE world_id = ?").run(id);
    this.db.prepare("DELETE FROM worlds WHERE id = ?").run(id);
  }
  rememberWorld(characterId: string, worldId: string) {
    this.db.prepare("INSERT OR REPLACE INTO world_members VALUES (?, ?)").run(characterId, worldId);
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
    const row = this.db
      .prepare("SELECT id, name, progress FROM characters WHERE token_hash = ?")
      .get(hash);
    if (!row)
      throw new Error(
        "Character save not found. Check that you are connected to the correct server.",
      );
    return { id: String(row.id), name: String(row.name), ...decode(String(row.progress)) };
  }
  create(name: string) {
    const token = randomBytes(32).toString("hex");
    const id = randomUUID();
    const progress = freshProgress();
    this.db
      .prepare("INSERT INTO characters VALUES (?, ?, ?, ?, ?)")
      .run(
        id,
        createHash("sha256").update(token).digest("hex"),
        name,
        JSON.stringify(progress),
        Date.now(),
      );
    return { token, id, name, ...decode(JSON.stringify(progress)) };
  }
  save(
    id: string,
    name: string,
    progress: CharacterProgress & Partial<Pick<Player, "classId" | "classes">>,
  ) {
    const row = this.db.prepare("SELECT progress FROM characters WHERE id = ?").get(id);
    if (!row) throw new Error("Character save is missing.");
    const previous = decode(String(row.progress));
    const classId = classSchema.parse(progress.classId ?? previous.classId);
    const classes = {
      ...previous.classes,
      ...progress.classes,
      [classId]: progressSchema.parse(progress),
    };
    for (const id of CLASS_IDS) classes[id] = progressSchema.parse(classes[id]);
    this.db
      .prepare("UPDATE characters SET name = ?, progress = ?, updated_at = ? WHERE id = ?")
      .run(name, JSON.stringify({ classId, classes }), Date.now(), id);
  }
  selectClass(id: string, player: Player, classId: ClassId) {
    const previousId = player.classId ?? "warrior";
    const classes = { ...player.classes, [previousId]: progressSchema.parse(player) } as Record<
      ClassId,
      CharacterProgress
    >;
    const next = classes[classId] ?? freshProgress();
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
  close() {
    this.db.close();
  }
}
