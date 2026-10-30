export * from './enums/index.ts';
export { nicknameSchema, type AccountView } from './account.ts';
import { z } from 'zod';
import { tacticsSchema } from './tactics.ts';
export * from './tactics.ts';
import { Difficulty } from './enums/Difficulty.ts';
import {
  backpackSchema,
  inventoryItemSchema,
  storagesSchema,
  storageNameSchema,
  type Merchant,
} from './inventory.ts';
export * from './inventory.ts';
import { equipmentSchema } from './equipment.ts';
export * from './equipment.ts';
export * from './scene.ts';
import type { SceneState } from './scene.ts';

export const classSchema = z.string().min(1).max(128);
export type ClassId = z.infer<typeof classSchema>;

const name = z.string().trim().min(1).max(24);
const password = z.string().max(64);
const characterToken = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .optional();
export const progressSchema = z
  .object({
    equipment: equipmentSchema.optional(),
    equipmentItems: z.record(z.string(), inventoryItemSchema).optional(),
    backpack: backpackSchema.optional(),
    storages: storagesSchema.optional(),
    talents: z.record(z.string(), z.number().int().nonnegative()).optional(),
    talentVersion: z.number().int().nonnegative().optional(),
    tactics: tacticsSchema.optional(),
    talentSlots: z.array(z.string().min(1).max(64).nullable()).length(4).optional(),
    level: z.number().int().min(1).max(10000),
    paragon: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    experience: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    hitpoints: z.number().finite().nonnegative(),
    maxHitpoints: z.number().finite().positive(),
    playtimeSeconds: z.number().finite().nonnegative(),
  })
  .refine((p) => p.hitpoints <= p.maxHitpoints);
export type CharacterProgress = z.infer<typeof progressSchema>;
export const clientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setTactics'), classId: classSchema, tactics: tacticsSchema }),
  z.object({
    type: z.literal('gather'),
    nodeId: z.string().min(1).max(64),
    epoch: z.string().min(1).max(64),
    checkId: z.string().min(1).max(64).optional(),
    at: z.number().finite().nonnegative().optional(),
  }),
  z.object({ type: z.literal('resetTalents'), classId: classSchema }),
  z.object({ type: z.literal('learnTalent'), nodeId: z.string().min(1).max(64) }),
  z.object({
    type: z.literal('equipTalent'),
    slot: z.number().int().min(0).max(3),
    nodeId: z.string().min(1).max(64).nullable(),
  }),
  z.object({
    type: z.literal('talentCast'),
    automatic: z.boolean().optional(),
    aimX: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
    aimY: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
    slot: z.number().int().min(0).max(3),
    classId: classSchema,
    epoch: z.string().min(1).max(64),
  }),
  z.object({ type: z.literal('useItem'), id: z.string().min(1).max(64) }),
  z.object({ type: z.literal('unequip'), slot: z.string().min(1).max(128) }),
  z.object({
    type: z.literal('trade'),
    npcId: z.enum(['innkeeper', 'craftsman']).optional(),
    id: z.string().min(1).max(64),
    buying: z.boolean(),
    amount: z.union([z.literal(1), z.literal(10), z.literal('stack')]).optional(),
  }),
  z.object({ type: z.literal('sellAll'), npcId: z.enum(['innkeeper', 'craftsman']).optional() }),
  z.object({ type: z.literal('npcInteraction'), npcId: z.string().min(1).max(64).nullable() }),
  z.object({
    type: z.literal('storeItem'),
    tab: z.number().int().min(0).max(2),
    id: z.string().min(1).max(64),
    depositing: z.boolean(),
  }),
  z.object({
    type: z.literal('renameStorage'),
    tab: z.number().int().min(0).max(2),
    name: storageNameSchema,
  }),
  z.object({
    type: z.literal('moveStorageItem'),
    fromTab: z.number().int().min(0).max(2),
    toTab: z.number().int().min(0).max(2),
    id: z.string().min(1).max(64),
  }),
  z.object({
    type: z.literal('chat'),
    text: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[^\p{Cc}\p{Cf}]*$/u),
  }),
  z.object({ type: z.literal('ping'), id: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }),
  z.object({ type: z.literal('create'), name, playerName: name, password, characterToken }),
  z.object({
    type: z.literal('join'),
    worldId: z.string().uuid(),
    playerName: name,
    password,
    characterToken,
  }),
  z.object({
    type: z.literal('resume'),
    worldId: z.string().uuid(),
    characterToken: characterToken.unwrap(),
  }),
  z.object({
    type: z.literal('combatInput'),
    autoAttack: z.boolean(),
    autoLoot: z.boolean().optional(),
    autoTarget: z.boolean(),
    attacking: z.boolean(),
    aimX: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
    aimY: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
  z.object({
    type: z.literal('cast'),
    id: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    epoch: z.string().min(1).max(64),
    classId: classSchema,
    autoTarget: z.boolean(),
    aimX: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
    aimY: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
  z.object({ type: z.literal('partyInteract'), targetId: z.string().uuid() }),
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('selectClass'), classId: classSchema }),
  z.object({
    type: z.literal('createScene'),
    scene: z.literal('Forest'),
    difficulty: z.enum(Difficulty),
  }),
  z.object({ type: z.literal('ready'), ready: z.boolean() }),
  z.object({ type: z.literal('joinScene') }),
  z.object({ type: z.literal('returnLobby') }),
  z.object({ type: z.literal('leaveScene') }),
  z.object({
    type: z.literal('move'),
    seq: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
    epoch: z.string().max(64).optional(),
    durationMs: z.number().finite().positive().max(50).optional(),
    x: z.number().finite().min(-1).max(1),
    y: z.number().finite().min(-1).max(1),
  }),
]);
export type ClientMessage = z.infer<typeof clientMessage>;
export interface Player extends CharacterProgress {
  partyId?: string;
  partyLeaderId?: string;
  homeRunId?: string;
  runId?: string;
  gathering?: TimedActivity & { nodeId: string; epoch: string };
  // coins and storages project the account Storehouse, not the selected class.
  reconnecting?: boolean;
  chat?: string;
  dps?: number;
  damageMeter?: {
    classId: ClassId;
    total: number;
    abilities: Record<string, { damage: number; dps: number }>;
  };
  bear?: Bear;
  classId?: ClassId;
  classes?: Record<ClassId, CharacterProgress>;
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  scene?: 'forest';
  attackAt?: number;
  /** Last processed manual request and the request that started the current attack. */
  castSeq?: number;
  talentCooldowns?: Record<string, number>;
  attackId?: number;
  attackAngle?: number;
  attackTargetId?: number;
  autoAttack?: boolean;
  autoLoot?: boolean;
  autoTarget?: boolean;
  attacking?: boolean;
  aimX?: number;
  aimY?: number;
  combatInputAt?: number;
  hurtAt?: number;
  inputSeq?: number;
  inputElapsed?: number;
  inputX?: number;
  inputY?: number;
  inputAt?: number;
}
export interface Bear {
  size?: number;
  range?: number;
  id: string;
  name: string;
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
export interface ResourceState {
  remaining: number;
  restoresAt: number;
}
export interface TimedActivity {
  startedAt: number;
  endsAt: number;
  durationMs: number;
  zoneStart: number;
  zoneAt: number;
  checkId: string;
}
export interface WorldState {
  partyRequests?: { fromId: string; expiresAt: number }[];
  resources?: Record<string, ResourceState>;
  npcs?: VillageNpc[];
  merchant?: Merchant;
  chat?: ChatMessage[];
  training?: SceneState;
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  scene?: SceneState;
  serverNow?: number;
}
export interface ChatMessage {
  recipientIds?: string[];
  dimension?: string;
  npcId?: string;
  tone?: 'danger' | 'success';
  id: string;
  excludedPlayerId?: string;
  playerId: string;
  name: string;
  text: string;
}
export interface VillageNpc {
  id: string;
  name: string;
  buildingId: string;
  x: number;
  y: number;
  angle: number;
  moving: boolean;
  silenced: boolean;
  chat?: string;
  chatUntil?: number;
  workstationId?: string;
  workStartedAt?: number;
}
export type ServerMessage =
  | { type: 'pong'; id: number }
  | { type: 'worlds'; worlds: WorldSummary[] }
  | { type: 'joined'; playerId: string; world: WorldState; characterToken: string }
  | { type: 'saved'; savedAt: number }
  | { type: 'state'; world: WorldState }
  | { type: 'left' }
  | { type: 'error'; message: string };

export { SCENE_COLLECTIONS, appendSceneEntities } from './entities.ts';
export type { SceneCollection, SceneEntity } from './entities.ts';

export * from './geometry.ts';
export type { Tree } from './world.ts';
