import { z } from 'zod';
import type { createItemRules } from './item-rules.ts';

export function createStorageRules(items: ReturnType<typeof createItemRules>) {
  const { backpackSchema } = items;
  // Twenty carried entries preserves the backpack capacity used by inventory/save validation.
  const INVENTORY_SLOTS = 20;
  // Storage holds twice a backpack's entries under the existing storage contract.
  const STORAGE_SLOTS = 40;
  // Saves and the storehouse expose exactly three named storage tabs.
  const STORAGE_TABS = 3;
  const storageNameSchema = z
    .string()
    .trim()
    .min(1)
    .regex(/^[^\p{Cc}\p{Cf}]*$/u);
  const storagesSchema = z
    .array(
      z.object({
        name: storageNameSchema,
        items: backpackSchema.refine((items) => {
          return items.length <= STORAGE_SLOTS;
        }),
      }),
    )
    .length(STORAGE_TABS)
    .refine((storages) => {
      const ids = storages.flatMap((storage) => {
        return storage.items.map((item) => {
          return item.id;
        });
      });

      return new Set(ids).size === ids.length;
    }, 'Duplicate stored item identity');

  function freshStorages(): z.infer<typeof storagesSchema> {
    return Array.from({ length: STORAGE_TABS }, (_, index) => {
      return { name: `Storage ${index + 1}`, items: [] };
    });
  }

  const storehouseSchema = z.object({
    coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    storages: storagesSchema,
  });

  return {
    INVENTORY_SLOTS,
    STORAGE_SLOTS,
    storageNameSchema,
    storagesSchema,
    freshStorages,
    storehouseSchema,
  };
}
