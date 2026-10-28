import { recoveryCooldownMs } from '../utils/recoveryCooldownMs.ts';
import { z } from 'zod';
import { progressSchema as progressShape, clientMessage as messageShape } from '@emberfall/common';
import type {
  Player,
  ClassId,
  EquipmentSlot,
  Equipment,
  GearDefinition,
  GearStats,
  DamageType,
} from '@emberfall/common';
import type { Registries } from './contracts.ts';
export interface CharacterStats extends GearStats {
  attributes: Readonly<Record<string, number>>;
  damageType: DamageType;
  hasWeapon: boolean;
  attackIntervalMs: number;
  cooldownRecoveryRate: number;
  damageReduction: number;
}
export type EquipmentOwner = Pick<Player, 'classId' | 'equipment' | 'talents'>;
export function createRules(content: Registries) {
  const EQUIPMENT_SLOTS = content.slots.values().map((slot) => slot.id);
  const SLOT_GEAR_TYPES = Object.fromEntries(
    content.slots.values().map((slot) => [slot.id, slot.gearTypes]),
  );
  const CLASS_GEAR_TYPES = Object.fromEntries(
    content.classes.values().map((player) => [player.id, player.gearTypes]),
  );
  const STARTER_WEAPONS = Object.fromEntries(
    content.classes.values().map((player) => [player.id, player.starterWeapon]),
  );
  const GEAR_DEFINITIONS = Object.fromEntries(
    content.items
      .values()
      .filter((item) => item.kind === 'gear')
      .map((item) => [item.id, item]),
  );
  const CONSUMABLES = Object.freeze(
    Object.fromEntries(
      content.items
        .values()
        .filter((item) => item.kind === 'consumable')
        .map((item) => [item.id, Object.freeze({ ...item, healing: item.healing! })]),
    ),
  );
  const INNATE_STATS = Object.fromEntries(
    content.stats.values().map((stat) => [stat.id, stat.default]),
  ) as GearStats & Record<string, number>;
  const BEAR_DEFINITION = content.companions.require('bear');
  function canEquip(slot: EquipmentSlot, item: GearDefinition, classId: ClassId) {
    return (
      content.classes.has(classId) &&
      !!item &&
      !!SLOT_GEAR_TYPES[slot]?.includes(item.gearType) &&
      (!content.slots.require(slot).classRestricted ||
        !!CLASS_GEAR_TYPES[classId]?.includes(item.gearType))
    );
  }
  const equipmentSchema = z
    .record(z.string(), z.string().nullable())
    .refine(
      (equipment) =>
        Object.entries(equipment).every(
          ([slot, id]) =>
            content.slots.has(slot) &&
            (id === null ||
              (!!GEAR_DEFINITIONS[id] &&
                (SLOT_GEAR_TYPES[slot as EquipmentSlot] as readonly string[]).includes(
                  GEAR_DEFINITIONS[id].gearType,
                ))),
        ),
      'Unknown or incompatible equipment',
    );
  function starterEquipment(classId: ClassId): Equipment {
    content.classes.require(classId);
    return { weapon: STARTER_WEAPONS[classId] };
  }
  function validateClassEquipment(equipment: Equipment, classId: ClassId) {
    const parsed = equipmentSchema.parse(equipment);
    if (
      !Object.entries(parsed).every(
        ([slot, id]) =>
          id === null || canEquip(slot as EquipmentSlot, GEAR_DEFINITIONS[id], classId),
      )
    )
      throw new Error('Equipment is incompatible with this class');
    return parsed;
  }
  function equippedItems(player: EquipmentOwner) {
    return player.equipment ?? starterEquipment(player.classId ?? 'warrior');
  }
  /** Definitions are immutable content; only equipped IDs belong to character saves. */
  function characterStats(player: EquipmentOwner): CharacterStats {
    const stats = { ...INNATE_STATS };
    const equipment = equippedItems(player);
    const classId = player.classId ?? 'warrior';
    let weapon: GearDefinition | undefined;
    for (const slot of EQUIPMENT_SLOTS) {
      const id = equipment[slot];
      const gear = id ? GEAR_DEFINITIONS[id] : undefined;
      if (!gear || !canEquip(slot, gear, classId)) continue;
      if (slot === 'weapon') weapon = gear;
      for (const key of Object.keys(gear.stats) as string[]) stats[key] += gear.stats[key] ?? 0;
    }
    const baseAttackRate = weapon?.stats.attacksPerSecond ?? 0;
    const cooldownRecoveryRate =
      baseAttackRate > 0 ? stats.attacksPerSecond / baseAttackRate - 1 : -1;
    const attackIntervalMs =
      baseAttackRate > 0
        ? recoveryCooldownMs(1000 / baseAttackRate, cooldownRecoveryRate)
        : Infinity;
    stats.attacksPerSecond = 1000 / attackIntervalMs;
    stats.criticalChance = Math.max(0, Math.min(1, stats.criticalChance));
    stats.criticalMultiplier = Math.max(1, stats.criticalMultiplier);
    stats.armor = Math.max(0, stats.armor);
    return {
      ...stats,
      attributes: Object.freeze({ ...stats }),
      damageType: weapon?.damageType ?? 'physical',
      hasWeapon: !!weapon,
      attackIntervalMs,
      cooldownRecoveryRate,
      damageReduction: stats.armor / (100 + stats.armor),
    };
  }
  function syncEquipmentVitals(player: Player) {
    const stats = characterStats(player);
    player.maxHitpoints = stats.maxHitpoints;
    player.hitpoints = Math.min(player.hitpoints, player.maxHitpoints);
  }
  function companionStats(player: Player): CharacterStats {
    return {
      ...characterStats(player),
      damageType: BEAR_DEFINITION.damageType as DamageType,
      range: BEAR_DEFINITION.range,
      manualRange: BEAR_DEFINITION.range,
      maxHitpoints: player.maxHitpoints * BEAR_DEFINITION.healthMultiplier,
    };
  }
  function itemDefinition(id: string) {
    return content.items.require(id);
  }
  const backpackSchema = z
    .array(
      z
        .object({
          id: z.string().min(1).max(64),
          itemId: z.string().refine((id) => content.items.has(id), 'Unknown item'),
          quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        })
        .refine((item) => {
          const definition = content.items.get(item.itemId);
          return (
            definition?.kind === 'consumable' ||
            (definition?.kind === 'resource' ? item.quantity <= 200 : item.quantity === 1)
          );
        }),
    )
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      'Duplicate item identity',
    );
  type BackpackItem = z.infer<typeof backpackSchema>[number];
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
  const BUYBACK_SLOTS = INVENTORY_SLOTS;
  const merchantSchema = z
    .object({
      refreshAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
      coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      backpack: backpackSchema,
      buyback: backpackSchema.refine((items) => items.length <= BUYBACK_SLOTS).optional(),
    })
    .transform((merchant) => ({
      ...merchant,
      backpack:
        merchant.buyback === undefined
          ? merchant.backpack.filter(
              (item) => !!CONSUMABLES[item.itemId as keyof typeof CONSUMABLES],
            )
          : merchant.backpack,
      buyback:
        merchant.buyback ??
        merchant.backpack
          .filter((item) => !CONSUMABLES[item.itemId as keyof typeof CONSUMABLES])
          .reverse()
          .slice(0, BUYBACK_SLOTS),
    }));
  type Merchant = z.infer<typeof merchantSchema>;
  function freshMerchant(now = Date.now()): Merchant {
    return {
      refreshAt: now + 30 * 60 * 1000,
      coins: 5000,
      backpack: [
        { id: crypto.randomUUID(), itemId: 'health-potion', quantity: 5 },
        { id: crypto.randomUUID(), itemId: 'empty-bottle', quantity: 200 },
      ],
      buyback: [],
    };
  }
  function addItem(backpack: BackpackItem[], item: BackpackItem, capacity = INVENTORY_SLOTS) {
    const definition = itemDefinition(item.itemId);
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      (definition.kind === 'gear' && item.quantity !== 1)
    )
      throw new Error('Invalid item quantity.');
    if (definition.kind === 'consumable') {
      const stack = backpack.find((entry) => entry.itemId === item.itemId);
      if (stack) {
        if (!Number.isSafeInteger(stack.quantity + item.quantity))
          throw new Error('Stack is too large.');
        stack.quantity += item.quantity;
        return;
      }
    }
    const limit =
      definition.kind === 'resource'
        ? 200
        : definition.kind === 'consumable'
          ? Number.MAX_SAFE_INTEGER
          : 1;
    const stacks =
      definition.kind === 'gear'
        ? []
        : backpack.filter((entry) => entry.itemId === item.itemId && entry.quantity < limit);
    let remaining = item.quantity;
    const planned = stacks.map((stack) => {
      const quantity = Math.min(remaining, limit - stack.quantity);
      remaining -= quantity;
      return { stack, quantity };
    });
    const slots = Math.ceil(remaining / limit);
    if (slots && backpack.length + slots > capacity)
      throw new Error('The destination inventory is full.');
    for (const { stack, quantity } of planned) stack.quantity += quantity;
    let first = true;
    while (remaining > 0) {
      const quantity = Math.min(remaining, limit);
      backpack.push({ ...item, id: first ? item.id : crypto.randomUUID(), quantity });
      first = false;
      remaining -= quantity;
    }
  }

  /** Move the whole entry only after the destination has accepted it. */
  function transferStoredItem(player: Player, tab: number, id: string, depositing: boolean) {
    const storage = player.storages?.[tab];
    if (!storage || !Number.isInteger(tab)) throw new Error('Invalid storage tab.');
    const backpack = (player.backpack ??= []);
    const source = depositing ? backpack : storage.items;
    const target = depositing ? storage.items : backpack;
    moveInventoryItem(source, target, id, depositing ? STORAGE_SLOTS : INVENTORY_SLOTS);
  }
  function moveStorageItem(player: Player, fromTab: number, toTab: number, id: string) {
    const source = player.storages?.[fromTab];
    const target = player.storages?.[toTab];
    if (
      !Number.isInteger(fromTab) ||
      !Number.isInteger(toTab) ||
      !source ||
      !target ||
      fromTab === toTab
    )
      throw new Error('Choose two different storage tabs.');
    moveInventoryItem(source.items, target.items, id, STORAGE_SLOTS);
  }
  function moveInventoryItem(
    source: BackpackItem[],
    target: BackpackItem[],
    id: string,
    capacity: number,
  ) {
    const index = source.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Item is no longer available.');
    addItem(target, source[index], capacity);
    source.splice(index, 1);
  }
  function useBackpackItem(player: Player, id: string) {
    const backpack = (player.backpack ??= []);
    const index = backpack.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Item is no longer in your backpack.');
    const item = backpack[index];
    const consumable = CONSUMABLES[item.itemId as keyof typeof CONSUMABLES];
    if (consumable) {
      if (player.hitpoints <= 0 || player.hitpoints >= player.maxHitpoints)
        throw new Error('You do not need healing.');
      player.hitpoints = Math.min(player.maxHitpoints, player.hitpoints + consumable.healing);
      if (--item.quantity === 0) backpack.splice(index, 1);
      return;
    }
    const gear = GEAR_DEFINITIONS[item.itemId];
    const slot = EQUIPMENT_SLOTS.find((slot) => canEquip(slot, gear, player.classId ?? 'warrior'));
    if (!slot) throw new Error('Your class cannot equip this item.');
    player.equipment = { ...equippedItems(player) };
    const previous = player.equipment[slot];
    if (previous) backpack[index] = { id: crypto.randomUUID(), itemId: previous, quantity: 1 };
    else backpack.splice(index, 1);
    player.equipment[slot] = item.itemId;
    syncEquipmentVitals(player);
  }
  function unequipItem(player: Player, slot: EquipmentSlot) {
    player.equipment = { ...equippedItems(player) };
    const itemId = player.equipment[slot];
    if (!itemId) throw new Error('This equipment slot is empty.');
    addItem((player.backpack ??= []), { id: crypto.randomUUID(), itemId, quantity: 1 });
    player.equipment[slot] = null;
    syncEquipmentVitals(player);
  }
  /** Transfer one item per action; both callers commit the two owners together. */
  function tradeItem(player: Player, merchant: Merchant, id: string, buying: boolean) {
    const source = buying ? merchant : player;
    const target = buying ? player : merchant;
    const backpack =
      buying && merchant.buyback.some((item) => item.id === id)
        ? merchant.buyback
        : (source.backpack ?? []);
    const index = backpack.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Item is no longer available.');
    const item = backpack[index];
    const price = itemDefinition(item.itemId).price ?? 1;
    if ((target.coins ?? 0) < price) throw new Error('Not enough gold.');
    if (!Number.isSafeInteger((source.coins ?? 0) + price))
      throw new Error('Gold balance is too large.');
    const transferred = { id: crypto.randomUUID(), itemId: item.itemId, quantity: 1 };
    if (buying) addItem((player.backpack ??= []), transferred);
    else {
      merchant.buyback.unshift(transferred);
      merchant.buyback.length = Math.min(merchant.buyback.length, BUYBACK_SLOTS);
    }
    if (--item.quantity === 0) backpack.splice(index, 1);
    target.coins = (target.coins ?? 0) - price;
    source.coins = (source.coins ?? 0) + price;
  }

  /** The server commits the detached player and merchant together, as for one-item trades. */
  function sellAll(player: Player, merchant: Merchant) {
    const items = player.backpack ?? [];
    const total = items.reduce(
      (sum, item) => sum + (itemDefinition(item.itemId).price ?? 1) * item.quantity,
      0,
    );
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger((player.coins ?? 0) + total))
      throw new Error('Gold balance is too large.');
    if (merchant.coins < total) throw new Error('Not enough gold.');
    merchant.buyback = [
      ...[...items]
        .reverse()
        .slice(0, BUYBACK_SLOTS)
        .map((item) => ({ ...item, id: crypto.randomUUID() })),
      ...merchant.buyback,
    ].slice(0, BUYBACK_SLOTS);
    merchant.coins -= total;
    player.coins = (player.coins ?? 0) + total;
    player.backpack = [];
  }

  const classSchema = z.string().refine((id) => content.classes.has(id), 'Unknown class');
  const progressSchema = progressShape.superRefine((progress, ctx) => {
    for (const [key, schema] of [
      ['equipment', equipmentSchema],
      ['backpack', backpackSchema],
      ['storages', storagesSchema],
    ] as const) {
      if (progress[key] === undefined) continue;
      const parsed = schema.safeParse(progress[key]);
      if (!parsed.success)
        ctx.addIssue({ code: 'custom', path: [key], message: parsed.error.message });
    }
  });
  const clientMessage = messageShape.superRefine((message, ctx) => {
    if ('classId' in message && !content.classes.has(message.classId))
      ctx.addIssue({ code: 'custom', path: ['classId'], message: 'Unknown class' });
    if (message.type === 'unequip' && !content.slots.has(message.slot))
      ctx.addIssue({ code: 'custom', path: ['slot'], message: 'Unknown slot' });
    const geometry = content.worlds.require('forest').value as {
      geometry: { width: number; height: number };
    };
    if (
      'aimX' in message &&
      (message.aimX < 0 ||
        message.aimX > geometry.geometry.width ||
        message.aimY < 0 ||
        message.aimY > geometry.geometry.height)
    )
      ctx.addIssue({ code: 'custom', message: 'Aim outside world' });
  });
  return Object.freeze({
    canEquip,
    equipmentSchema,
    starterEquipment,
    validateClassEquipment,
    equippedItems,
    characterStats,
    syncEquipmentVitals,
    companionStats,
    itemDefinition,
    CONSUMABLES,
    backpackSchema,
    INVENTORY_SLOTS,
    STORAGE_SLOTS,
    storageNameSchema,
    storagesSchema,
    freshStorages,
    storehouseSchema,
    BUYBACK_SLOTS,
    merchantSchema,
    freshMerchant,
    addItem,
    transferStoredItem,
    moveStorageItem,
    useBackpackItem,
    unequipItem,
    tradeItem,
    sellAll,
    classSchema,
    progressSchema,
    clientMessage,
  });
}
