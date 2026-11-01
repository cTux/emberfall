import { z } from 'zod';
import { tacticsSchema, OFFENSIVE_PRIORITIES } from './tactics.ts';
import { Difficulty } from './enums/Difficulty.ts';
import { storageNameSchema, MAX_ITEM_STARS } from './inventory.ts';
import { classSchema } from './progress.ts';
import { CONTRACT_LIMITS } from './limits.ts';

const name = z.string().trim().min(1).max(CONTRACT_LIMITS.nameCharacters);
const password = z.string().max(CONTRACT_LIMITS.passwordCharacters);
// Legacy credentials contain a 32-byte token encoded as exactly 64 hexadecimal characters.
const characterToken = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .optional();
export const clientMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('improveItem'),
    id: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
    slot: z.string().min(1).max(CONTRACT_LIMITS.contentIdCharacters).optional(),
    stars: z
      .number()
      .int()
      .min(0)
      .max(MAX_ITEM_STARS - 1),
  }),
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
    nodeId: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
    epoch: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
    checkId: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters).optional(),
    at: z.number().finite().nonnegative().optional(),
  }),
  z.object({ type: z.literal('resetTalents'), classId: classSchema }),
  z.object({
    type: z.literal('learnTalent'),
    nodeId: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
  }),
  z.object({
    type: z.literal('equipTalent'),
    slot: z
      .number()
      .int()
      .min(0)
      .max(CONTRACT_LIMITS.talentSlots - 1),
    nodeId: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters).nullable(),
  }),
  z.object({
    type: z.literal('talentCast'),
    automatic: z.boolean().optional(),
    aimX: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
    aimY: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
    slot: z
      .number()
      .int()
      .min(0)
      .max(CONTRACT_LIMITS.talentSlots - 1),
    classId: classSchema,
    epoch: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
  }),
  z.object({
    type: z.literal('useItem'),
    id: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
  }),
  z.object({
    type: z.literal('unequip'),
    slot: z.string().min(1).max(CONTRACT_LIMITS.contentIdCharacters),
  }),
  z.object({
    type: z.literal('trade'),
    npcId: z.enum(['innkeeper', 'craftsman']).optional(),
    id: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
    buying: z.boolean(),
    amount: z
      .union([z.literal(1), z.literal(CONTRACT_LIMITS.tradeBundleQuantity), z.literal('stack')])
      .optional(),
  }),
  z.object({ type: z.literal('sellAll'), npcId: z.enum(['innkeeper', 'craftsman']).optional() }),
  z.object({
    type: z.literal('npcInteraction'),
    npcId: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters).nullable(),
  }),
  z.object({
    type: z.literal('storeItem'),
    tab: z
      .number()
      .int()
      .min(0)
      .max(CONTRACT_LIMITS.storageTabs - 1),
    id: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
    depositing: z.boolean(),
  }),
  z.object({
    type: z.literal('renameStorage'),
    tab: z
      .number()
      .int()
      .min(0)
      .max(CONTRACT_LIMITS.storageTabs - 1),
    name: storageNameSchema,
  }),
  z.object({
    type: z.literal('moveStorageItem'),
    fromTab: z
      .number()
      .int()
      .min(0)
      .max(CONTRACT_LIMITS.storageTabs - 1),
    toTab: z
      .number()
      .int()
      .min(0)
      .max(CONTRACT_LIMITS.storageTabs - 1),
    id: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
  }),
  z.object({
    type: z.literal('chat'),
    text: z
      .string()
      .trim()
      .min(1)
      .max(CONTRACT_LIMITS.chatCharacters)
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
    epoch: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
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
    dimension: z.enum(['forest', 'swamp', 'desert']).optional(),
    difficulty: z.enum(Difficulty),
  }),
  z.object({ type: z.literal('ready'), ready: z.boolean() }),
  z.object({ type: z.literal('joinScene') }),
  z.object({ type: z.literal('returnLobby') }),
  z.object({ type: z.literal('leaveScene') }),
  z.object({
    type: z.literal('move'),
    seq: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
    epoch: z.string().max(CONTRACT_LIMITS.instanceIdCharacters).optional(),
    durationMs: z.number().finite().positive().max(CONTRACT_LIMITS.movementDurationMs).optional(),
    x: z.number().finite().min(-1).max(1),
    y: z.number().finite().min(-1).max(1),
  }),
]);
export type ClientMessage = z.infer<typeof clientMessage>;
