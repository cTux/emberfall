import { z } from 'zod';
export const itemRollSchema = z.object({
  rarity: z.string().min(1).max(32).optional(),
  stats: z.record(z.string().min(1).max(64), z.number().finite().nonnegative()).optional(),
});
export const inventoryItemSchema = itemRollSchema.extend({
  id: z.string().min(1).max(64),
  itemId: z.string().min(1).max(128),
  quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export const backpackSchema = z
  .array(inventoryItemSchema)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    'Duplicate item identity',
  );
export type BackpackItem = z.infer<typeof backpackSchema>[number];
export const INVENTORY_SLOTS = 20;
export const STORAGE_SLOTS = 40;
export const storageNameSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[^\p{Cc}\p{Cf}]*$/u);
export const storagesSchema = z
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
export function freshStorages(): z.infer<typeof storagesSchema> {
  return Array.from({ length: 3 }, (_, index) => ({ name: `Storage ${index + 1}`, items: [] }));
}
export const storehouseSchema = z.object({
  coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  storages: storagesSchema,
});
export const BUYBACK_SLOTS = INVENTORY_SLOTS;
export const merchantSchema = z.object({
  refreshAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  backpack: backpackSchema,
  buyback: backpackSchema.refine((items) => items.length <= BUYBACK_SLOTS).optional(),
});
export interface Merchant {
  refreshAt?: number;
  coins: number;
  backpack: BackpackItem[];
  buyback: BackpackItem[];
}
