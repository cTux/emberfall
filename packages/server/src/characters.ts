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
  manapoints: 50,
  maxManapoints: 50,
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
  }
  load(token: string) {
    const hash = createHash("sha256").update(token).digest("hex");
    const row = this.db
      .prepare("SELECT id, progress FROM characters WHERE token_hash = ?")
      .get(hash);
    if (!row)
      throw new Error(
        "Character save not found. Check that you are connected to the correct server.",
      );
    return { id: String(row.id), ...decode(String(row.progress)) };
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
    return { token, id, ...decode(JSON.stringify(progress)) };
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
