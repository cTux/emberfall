import { z } from 'zod';
import type { createItemRules } from './item-rules.ts';

export function createStorageRules(items: ReturnType<typeof createItemRules>) {
  const { backpackSchema } = items;
  const INVENTORY_SLOTS = 20;
  const STORAGE_SLOTS = 40;
  const storageNameSchema = z
    .string()
    .trim()
    .min(1)
    .regex(/^[^\p{Cc}\p{Cf}]*$/u);
  const storagesSchema = z
    .array(
      z.object({
        name: storageNameSchema,
        items: backpackSchema.refine((items) => items.length <= STORAGE_SLOTS),
      }),
    )
    .length(3)
    .refine((storages) => {
      const ids = storages.flatMap((storage) => storage.items.map((item) => item.id));
      return new Set(ids).size === ids.length;
    }, 'Duplicate stored item identity');
  function freshStorages(): z.infer<typeof storagesSchema> {
    return Array.from({ length: 3 }, (_, index) => ({ name: `Storage ${index + 1}`, items: [] }));
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
