import { storageNameSchema } from './storage-name-schema.ts';
import { backpackSchema } from './backpack-schema.ts';
import { STORAGE_SLOTS } from './storage-slots.ts';
import { z } from 'zod';
import { CONTRACT_LIMITS } from './limits.ts';
// The item-instance contract supports the five improvement tiers requested for the anvil.

export const storagesSchema = z
  .array(
    z.object({
      name: storageNameSchema,
      items: backpackSchema.refine((items) => {
        return items.length <= STORAGE_SLOTS;
      }),
    }),
  )
  .length(CONTRACT_LIMITS.storageTabs)
  .refine((storages) => {
    const ids = storages.flatMap((storage) => {
      return storage.items.map((item) => {
        return item.id;
      });
    });

    return new Set(ids).size === ids.length;
  }, 'Duplicate stored item identity');
