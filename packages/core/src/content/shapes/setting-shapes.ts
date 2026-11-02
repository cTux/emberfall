import { z } from 'zod';
import { positive, nonnegative, id, point } from './primitives.ts';

// Match the wire chat schema's existing 200-character ceiling; mods can only lower it.

// Match the wire chat schema's existing 200-character ceiling; mods can only lower it.
const MAX_CHAT_MESSAGE_LENGTH = 200;

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
  dimensions: z.object(
    Object.fromEntries(
      ['forest', 'swamp', 'desert'].map((dimension) => {
        return [
          dimension,
          z.object({
            id: z.literal(dimension),
            name: z.string().min(1),
            enemyMultiplier: positive,
            rarityMultiplier: positive,
            enemies: z.array(id).min(1),
            boss: id,
            resources: z.object({ tree: id, plant: id, rock: id, stone: id }),
          }),
        ];
      }),
    ),
  ),
  spawnFallbacks: z.array(id).min(1),
  villageCritters: z.array(point.extend({ kind: id })),
  lobbyPortal: point,
  interactionRadius: positive,
};
