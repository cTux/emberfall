import { z } from 'zod';
import { id, positive } from './primitives.ts';

// Match the wire chat schema's existing 200-character ceiling; mods can only lower it.

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
