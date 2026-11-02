import { backpackSchema } from './backpack-schema.ts';
import { BUYBACK_SLOTS } from './buyback-slots.ts';
import { z } from 'zod';

const traderSchema = z.object({
  refreshAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  backpack: backpackSchema,
  buyback: backpackSchema
    .refine((items) => {
      return items.length <= BUYBACK_SLOTS;
    })
    .optional(),
});

export const merchantSchema = traderSchema.extend({ craftsman: traderSchema.optional() });
