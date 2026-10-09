import { z } from "zod";
import {
  EQUIPMENT_SLOTS,
  GEAR_DEFINITIONS,
  canEquip,
  equippedItems,
  syncEquipmentVitals,
} from "./equipment.ts";
import type { Player, EquipmentSlot } from "./index.ts";

export const CONSUMABLES = {
  "health-potion": { id: "health-potion", name: "Health potion", price: 1, healing: 25 },
} as const;
export function itemDefinition(id: string) {
  return GEAR_DEFINITIONS[id] ?? CONSUMABLES[id as keyof typeof CONSUMABLES];
}
export const backpackSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(64),
        itemId: z
          .string()
          .refine(
            (id) => Object.hasOwn(GEAR_DEFINITIONS, id) || Object.hasOwn(CONSUMABLES, id),
            "Unknown item",
          ),
        quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      })
      .refine(
        (item) => !!CONSUMABLES[item.itemId as keyof typeof CONSUMABLES] || item.quantity === 1,
      ),
  )
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "Duplicate item identity",
  );
export type BackpackItem = z.infer<typeof backpackSchema>[number];
export const merchantSchema = z.object({
  coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  backpack: backpackSchema,
});
export type Merchant = z.infer<typeof merchantSchema>;
export function freshMerchant(): Merchant {
  return {
    coins: 5000,
    backpack: [{ id: crypto.randomUUID(), itemId: "health-potion", quantity: 5 }],
  };
}
export function addItem(backpack: BackpackItem[], item: BackpackItem) {
  const stack =
    CONSUMABLES[item.itemId as keyof typeof CONSUMABLES] &&
    backpack.find((entry) => entry.itemId === item.itemId);
  if (stack) {
    if (!Number.isSafeInteger(stack.quantity + item.quantity))
      throw new Error("Stack is too large.");
    stack.quantity += item.quantity;
  } else backpack.push({ ...item });
}
export function useBackpackItem(player: Player, id: string) {
  const backpack = (player.backpack ??= []);
  const index = backpack.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Item is no longer in your backpack.");
  const item = backpack[index];
  const consumable = CONSUMABLES[item.itemId as keyof typeof CONSUMABLES];
  if (consumable) {
    if (player.hitpoints <= 0 || player.hitpoints >= player.maxHitpoints)
      throw new Error("You do not need healing.");
    player.hitpoints = Math.min(player.maxHitpoints, player.hitpoints + consumable.healing);
    if (--item.quantity === 0) backpack.splice(index, 1);
    return;
  }
  const gear = GEAR_DEFINITIONS[item.itemId];
  const slot = EQUIPMENT_SLOTS.find((slot) => canEquip(slot, gear, player.classId ?? "warrior"));
  if (!slot) throw new Error("Your class cannot equip this item.");
  player.equipment = { ...equippedItems(player) };
  const previous = player.equipment[slot];
  backpack.splice(index, 1);
  if (previous) addItem(backpack, { id: crypto.randomUUID(), itemId: previous, quantity: 1 });
  player.equipment[slot] = item.itemId;
  syncEquipmentVitals(player);
}
export function unequipItem(player: Player, slot: EquipmentSlot) {
  player.equipment = { ...equippedItems(player) };
  const itemId = player.equipment[slot];
  if (!itemId) throw new Error("This equipment slot is empty.");
  addItem((player.backpack ??= []), { id: crypto.randomUUID(), itemId, quantity: 1 });
  player.equipment[slot] = null;
  syncEquipmentVitals(player);
}
/** Transfer one item per action; both callers commit the two owners together. */
export function tradeItem(player: Player, merchant: Merchant, id: string, buying: boolean) {
  const source = buying ? merchant : player;
  const target = buying ? player : merchant;
  const backpack = source.backpack ?? [];
  const index = backpack.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Item is no longer available.");
  const item = backpack[index];
  const price = itemDefinition(item.itemId).price ?? 1;
  if ((target.coins ?? 0) < price) throw new Error("Not enough gold.");
  if (!Number.isSafeInteger((source.coins ?? 0) + price))
    throw new Error("Gold balance is too large.");
  addItem((target.backpack ??= []), { id: crypto.randomUUID(), itemId: item.itemId, quantity: 1 });
  if (--item.quantity === 0) backpack.splice(index, 1);
  target.coins = (target.coins ?? 0) - price;
  source.coins = (source.coins ?? 0) + price;
}
