import { z } from 'zod';
import { tacticsSchema, OFFENSIVE_PRIORITIES } from './tactics.ts';
import { Difficulty } from './enums/Difficulty.ts';
import { storageNameSchema } from './inventory.ts';
import { classSchema } from './progress.ts';

const name = z.string().trim().min(1).max(24);
const password = z.string().max(64);
const characterToken = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .optional();
export const clientMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('moveTacticsPriority'),
    classId: classSchema,
    list: z.enum(['offensive', 'defensive']),
    rule: z.enum([...OFFENSIVE_PRIORITIES, 'players', 'self']),
    direction: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.object({
    type: z.literal('setTactics'),
    classId: classSchema,
    tactics: tacticsSchema.partial(),
  }),
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
