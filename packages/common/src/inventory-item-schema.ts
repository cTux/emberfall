import { itemRollSchema } from './item-roll-schema.ts';
import { z } from 'zod';
import { CONTRACT_LIMITS } from './limits.ts';
// The item-instance contract supports the five improvement tiers requested for the anvil.

export const inventoryItemSchema = itemRollSchema.extend({
  id: z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
  itemId: z.string().min(1).max(CONTRACT_LIMITS.contentIdCharacters),
  quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
