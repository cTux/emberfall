import { z } from 'zod';
import { positive, nonnegative } from './primitives.ts';

// Match the wire chat schema's existing 200-character ceiling; mods can only lower it.

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
