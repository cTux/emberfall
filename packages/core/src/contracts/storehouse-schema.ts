import { storagesSchema } from './storages-schema.ts';
import { z } from 'zod';

export const storehouseSchema = z.object({
  coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  storages: storagesSchema,
});
