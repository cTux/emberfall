import { z } from 'zod';
import { id, positive, nonnegative, point } from './primitives.ts';

// Match the wire chat schema's existing 200-character ceiling; mods can only lower it.
const MAX_CHAT_MESSAGE_LENGTH = 200;

export const encounterShapes = {
  forest: z.object({
    id: z.literal('forest'),
    boss: id,
    spawnIntervalMs: positive,
    bossPlacementAttempts: positive.int(),
    spawnRadius: positive,
    spawnRingAttempts: positive.int(),
    spawnRingSpacing: positive,
    spawnAngleStep: positive,
    blockedSpawnRetryMs: positive,
  }),
  training: z.object({
    id: z.literal('training'),
    rewards: z.literal(false),
    refreshMs: positive,
    triangleRows: positive.int(),
    spacing: positive,
    dummyName: z.string().min(1),
    hitpoints: positive,
  }),
};
export const settingShapes: Record<string, z.ZodType> = {
  runtime: z.object({
    tickMs: positive,
    maxPlayers: positive.int(),
    chatLimit: positive.int(),
    chatMaxLength: positive.int().max(MAX_CHAT_MESSAGE_LENGTH),
    autosaveMs: positive,
    reconnectMs: positive,
    predictionLimitMs: positive,
    protocolVersion: positive.int(),
  }),
  collision: z.object({
    companionRadius: positive,
    feetOffset: z.number().finite(),
    playerProjectileRadius: positive,
    enemyProjectileRadius: positive,
  }),
  initialProgress: z.object({
    level: positive.int(),
    paragon: nonnegative.int(),
    experience: nonnegative,
    coins: nonnegative.int(),
    hitpoints: positive,
    maxHitpoints: positive,
    playtimeSeconds: nonnegative,
    talents: z.record(id, nonnegative),
  }),
  playerBodyRadius: positive,
  enemyRules: z.object({
    damageCooldownMs: positive,
    maxAlive: positive.int(),
    bruteChance: nonnegative.max(1),
    casterChance: nonnegative.max(1),
    casterStopRange: positive,
    projectileSpeed: positive,
    projectileLifetimeMs: positive,
    spawnWarningMs: positive,
    healthPerMember: positive,
    experiencePerMember: positive,
  }),
  pickupRules: z.object({
    initialHopMs: positive,
    lifetimeMs: positive,
    capacity: positive.int(),
    collectRadius: positive,
    attractionRadius: positive,
    speed: positive,
  }),
  spawnFallbacks: z.array(id).min(1),
  villageCritters: z.array(point.extend({ kind: id })),
  lobbyPortal: point,
  interactionRadius: positive,
};
export const pickupShapes = {
  experience: z.object({
    id: z.literal('experience'),
    baseAmount: positive,
    shared: z.literal(true),
  }),
  gold: z.object({
    id: z.literal('gold'),
    chance: nonnegative.max(1),
    baseAmount: positive,
    shared: z.literal(false),
    grantsCurrency: z.literal(true),
  }),
};
export const effectShapes = {
  damage: z.object({ id: z.literal('damage'), lifetimeMs: positive }),
  explosion: z.object({ id: z.literal('explosion'), lifetimeMs: positive, radius: positive }),
  blood: z.object({ id: z.literal('blood'), lifetimeMs: positive }),
  hitFlash: z.object({ id: z.literal('hit-flash'), lifetimeMs: positive }),
};
