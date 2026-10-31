import { recoveryCooldownMs } from '../utils/recoveryCooldownMs.ts';
import { talentNodeId, talentRank } from '../talent-tree.ts';
import { z } from 'zod';
import { ItemStat } from '../item-stats.ts';
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
  bonuses: Readonly<Record<ItemStat, number>>;
  attributes: Readonly<Record<string, number>>;
  damageType: DamageType;
  hasWeapon: boolean;
  attackIntervalMs: number;
  cooldownRecoveryRate: number;
  damageReduction: number;
}
export type EquipmentOwner = Pick<Player, 'classId' | 'equipment' | 'equipmentItems' | 'talents'>;
export function createEquipmentRules(content: Registries) {
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
                SLOT_GEAR_TYPES[slot].includes(GEAR_DEFINITIONS[id].gearType))),
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
        ([slot, id]) => id === null || canEquip(slot, GEAR_DEFINITIONS[id], classId),
      )
    )
      throw new Error('Equipment is incompatible with this class');

    return parsed;
  }

  function equippedItems(player: EquipmentOwner) {
    return player.equipment ?? starterEquipment(player.classId ?? 'warrior');
  }

  /** Definitions stay immutable; equipped instances preserve each item's rolled stats. */
  function characterStats(player: EquipmentOwner): CharacterStats {
    const stats = { ...INNATE_STATS };
    const bonuses = Object.fromEntries(Object.values(ItemStat).map((stat) => [stat, 0])) as Record<
      ItemStat,
      number
    >;
    const equipment = equippedItems(player);
    const classId = player.classId ?? 'warrior';
    let weapon: GearDefinition | undefined;
    for (const slot of EQUIPMENT_SLOTS) {
      const id = equipment[slot];
      const gear = id ? GEAR_DEFINITIONS[id] : undefined;
      if (!gear || !canEquip(slot, gear, classId)) continue;
      if (slot === 'weapon') weapon = gear;
      for (const key of Object.keys(gear.stats)) stats[key] += gear.stats[key] ?? 0;
      const instance = player.equipmentItems?.[slot];
      if (instance?.itemId === id)
        for (const [stat, value] of Object.entries(instance.stats ?? {}))
          bonuses[stat as ItemStat] += value;
    }

    stats.power += bonuses.power;
    stats.armor += bonuses.armor;
    stats.maxHitpoints += bonuses.maximumHealth;
    stats.criticalChance += bonuses.criticalChance / 100;
    stats.criticalMultiplier += bonuses.criticalDamage / 100;
    stats.attacksPerSecond *= 1 + bonuses.attackSpeed / 100;
    stats.range *= 1 + bonuses.range / 100;
    stats.manualRange *= 1 + bonuses.range / 100;
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
      bonuses: Object.freeze(bonuses),
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
    const packHowl =
      player.classId === 'druid' && talentRank(player, talentNodeId('druid', 1, 3)) > 0;

    return {
      ...characterStats(player),
      damageType: BEAR_DEFINITION.damageType,
      range: BEAR_DEFINITION.range * (packHowl ? 1.3 : 1),
      manualRange: BEAR_DEFINITION.range * (packHowl ? 1.3 : 1),
      maxHitpoints: player.maxHitpoints * BEAR_DEFINITION.healthMultiplier * (packHowl ? 1.3 : 1),
    };
  }

  return {
    canEquip,
    equipmentSchema,
    starterEquipment,
    validateClassEquipment,
    equippedItems,
    characterStats,
    syncEquipmentVitals,
    companionStats,
    GEAR_DEFINITIONS,
    EQUIPMENT_SLOTS,
  };
}
