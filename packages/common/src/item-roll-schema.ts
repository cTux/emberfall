import { MAX_ITEM_STARS } from './max-item-stars.ts';
import { z } from 'zod';
import { CONTRACT_LIMITS } from './limits.ts';
// The item-instance contract supports the five improvement tiers requested for the anvil.

export const itemRollSchema = z.object({
  stars: z.number().int().min(0).max(MAX_ITEM_STARS).optional(),
  rarity: z.string().min(1).max(CONTRACT_LIMITS.rarityIdCharacters).optional(),
  stats: z
    .record(
      z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters),
      z.number().finite().nonnegative(),
    )
    .optional(),
});
