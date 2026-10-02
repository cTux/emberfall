import { z } from "zod";
export {
  ARENA,
  TREES,
  BUILDINGS,
  PATHS,
  TORCHES,
  TRAINING_ZONES,
  inTrainingZone,
  onPath,
  moveActor,
} from "./world.ts";
export * from "./scene.ts";
export * from "./simulation.ts";
export * from "./training.ts";
export { fireClassAttack, advancePlayerShot } from "./class-combat.ts";
export { ENEMY_HP, ENEMY_STATS, enemyMaxHealth, spawnArchetype } from "./enemies.ts";
import type { SceneState } from "./scene.ts";

export const MAX_PLAYERS = 8;
export const CLASS_IDS = ["warrior", "ranger", "mage", "druid"] as const;
export const classSchema = z.enum(CLASS_IDS);
export type ClassId = z.infer<typeof classSchema>;
export const CLASS_LABELS = {
  warrior: "Warrior",
  ranger: "Ranger",
  mage: "Mage",
  druid: "Druid",
} as const;
const name = z.string().trim().min(1).max(24);
const password = z.string().max(64);
const characterToken = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .optional();
export const progressSchema = z
  .object({
    talents: z.record(z.string(), z.number().int().nonnegative()).optional(),
    level: z.number().int().min(1).max(10000),
    experience: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    hitpoints: z.number().finite().nonnegative(),
    maxHitpoints: z.number().finite().positive(),
    manapoints: z.number().finite().nonnegative(),
    maxManapoints: z.number().finite().positive(),
    playtimeSeconds: z.number().finite().nonnegative(),
  })
  .refine((p) => p.hitpoints <= p.maxHitpoints && p.manapoints <= p.maxManapoints);
export type CharacterProgress = z.infer<typeof progressSchema>;
export const clientMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping"), id: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }),
  z.object({ type: z.literal("create"), name, playerName: name, password, characterToken }),
  z.object({
    type: z.literal("join"),
    worldId: z.string().uuid(),
    playerName: name,
    password,
    characterToken,
  }),
  z.object({
    type: z.literal("resume"),
    worldId: z.string().uuid(),
    characterToken: characterToken.unwrap(),
  }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("selectClass"), classId: classSchema }),
  z.object({
    type: z.literal("createScene"),
    scene: z.literal("Forest"),
    difficulty: z.literal("Easy"),
  }),
  z.object({ type: z.literal("ready"), ready: z.boolean() }),
  z.object({ type: z.literal("joinScene") }),
  z.object({ type: z.literal("returnLobby") }),
  z.object({ type: z.literal("leaveScene") }),
  z.object({
    type: z.literal("move"),
    seq: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
    epoch: z.string().max(64).optional(),
    durationMs: z.number().finite().positive().max(50).optional(),
    x: z.number().finite().min(-1).max(1),
    y: z.number().finite().min(-1).max(1),
  }),
]);
export type ClientMessage = z.infer<typeof clientMessage>;
export interface Player extends CharacterProgress {
  dps?: number;
  bear?: Bear;
  classId?: ClassId;
  classes?: Record<ClassId, CharacterProgress>;
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  scene?: "forest";
  attackAt?: number;
  attackAngle?: number;
  hurtAt?: number;
  inputSeq?: number;
  inputElapsed?: number;
  inputX?: number;
  inputY?: number;
  inputAt?: number;
}
export interface Bear {
  id: string;
  name: "Bear";
  x: number;
  y: number;
  hitpoints: number;
  maxHitpoints: number;
  attackAt?: number;
  attackAngle?: number;
  hurtAt?: number;
  resurrectAt?: number;
  returning: boolean;
  moving?: boolean;
}
export interface WorldSummary {
  id: string;
  name: string;
  locked: boolean;
  players: number;
  capacity: number;
}
export interface WorldState {
  training?: SceneState;
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  scene?: SceneState;
  serverNow?: number;
}
export type ServerMessage =
  | { type: "pong"; id: number }
  | { type: "worlds"; worlds: WorldSummary[] }
  | { type: "joined"; playerId: string; world: WorldState; characterToken: string }
  | { type: "saved"; savedAt: number }
  | { type: "state"; world: WorldState }
  | { type: "left" }
  | { type: "error"; message: string };
