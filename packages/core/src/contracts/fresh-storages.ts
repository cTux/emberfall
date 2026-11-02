import type { storagesSchema } from './storages-schema.ts';
import type { z } from 'zod';
import { CONTRACT_LIMITS } from './limits.ts';
// The item-instance contract supports the five improvement tiers requested for the anvil.

export function freshStorages(): z.infer<typeof storagesSchema> {
  return Array.from({ length: CONTRACT_LIMITS.storageTabs }, (_, index) => {
    return { name: `Storage ${index + 1}`, items: [] };
  });
}
