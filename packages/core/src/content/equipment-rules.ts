import { recoveryCooldownMs } from '../utils/recoveryCooldownMs.ts';
import { talentNodeId, talentRank } from '../talent-tree.ts';
import { z } from 'zod';
import { ItemStat } from '../item-stats.ts';
import { MILLISECONDS_PER_SECOND, PERCENT } from '@emberfall/common';
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
import { itemStatMultiplier } from '../item-improvement.ts';

// Existing armor curve: 100 armor reduces incoming damage by exactly one half.
const ARMOR_FOR_HALF_REDUCTION = 100;
// The registered druid node at column 1/row 3 grants the existing 30% Bear range/health boost.
const PACK_HOWL = { column: 1, row: 3, multiplier: 1.3 } as const;

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
  const EQUIPMENT_SLOTS = content.slots.values().map((slot) => {
    return slot.id;
  });
  const SLOT_GEAR_TYPES = Object.fromEntries(
    content.slots.values().map((slot) => {
      return [slot.id, slot.gearTypes];
    }),
  );
  const CLASS_GEAR_TYPES = Object.fromEntries(
    content.classes.values().map((player) => {
      return [player.id, player.gearTypes];
    }),
  );
  const STARTER_WEAPONS = Object.fromEntries(
    content.classes.values().map((player) => {
      return [player.id, player.starterWeapon];
    }),
  );
  const GEAR_DEFINITIONS = Object.fromEntries(
    content.items
      .values()
      .filter((item) => {
        return item.kind === 'gear';
      })
      .map((item) => {
        return [item.id, item];
      }),
  );
  const INNATE_STATS = Object.fromEntries(
    content.stats.values().map((stat) => {
      return [stat.id, stat.default];
    }),
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

  const equipmentSchema = z.record(z.string(), z.string().nullable()).refine((equipment) => {
    return Object.entries(equipment).every(([slot, id]) => {
      return (
        content.slots.has(slot) &&
        (id === null ||
          (!!GEAR_DEFINITIONS[id] && SLOT_GEAR_TYPES[slot].includes(GEAR_DEFINITIONS[id].gearType)))
      );
    });
  }, 'Unknown or incompatible equipment');

  function starterEquipment(classId: ClassId): Equipment {
    content.classes.require(classId);

    return { weapon: STARTER_WEAPONS[classId] };
  }

  function validateClassEquipment(equipment: Equipment, classId: ClassId) {
    const parsed = equipmentSchema.parse(equipment);

    if (
      !Object.entries(parsed).every(([slot, id]) => {
        return id === null || canEquip(slot, GEAR_DEFINITIONS[id], classId);
      })
    ) {
      throw new Error('Equipment is incompatible with this class');
    }

    return parsed;
  }

  function equippedItems(player: EquipmentOwner) {
    return player.equipment ?? starterEquipment(player.classId ?? 'warrior');
  }

  /** Definitions stay immutable; equipped instances preserve each item's rolled stats. */
  function characterStats(player: EquipmentOwner): CharacterStats {
    const stats = { ...INNATE_STATS };
    const bonuses = Object.fromEntries(
      Object.values(ItemStat).map((stat) => {
        return [stat, 0];
      }),
    ) as Record<ItemStat, number>;
    const equipment = equippedItems(player);
    const classId = player.classId ?? 'warrior';
    let weapon: GearDefinition | undefined;

    for (const slot of EQUIPMENT_SLOTS) {
      const id = equipment[slot];
      const gear = id ? GEAR_DEFINITIONS[id] : undefined;

      if (!gear || !canEquip(slot, gear, classId)) {
        continue;
      }

      if (slot === 'weapon') {
        weapon = gear;
      }

      const instance = player.equipmentItems?.[slot];
      const multiplier = itemStatMultiplier(instance?.itemId === id ? instance : undefined);

      for (const key of Object.keys(gear.stats)) {
        stats[key] += (gear.stats[key] ?? 0) * multiplier;
      }

      if (instance?.itemId === id) {
        for (const [stat, value] of Object.entries(instance.stats ?? {})) {
          bonuses[stat as ItemStat] += value * multiplier;
        }
      }
    }

    stats.power += bonuses.power;
    stats.armor += bonuses.armor;
    stats.maxHitpoints += bonuses.maximumHealth;
    stats.criticalChance += bonuses.criticalChance / PERCENT;
    stats.criticalMultiplier += bonuses.criticalDamage / PERCENT;
    stats.attacksPerSecond *= 1 + bonuses.attackSpeed / PERCENT;
    stats.range *= 1 + bonuses.range / PERCENT;
    stats.manualRange *= 1 + bonuses.range / PERCENT;
    const baseAttackRate = weapon?.stats.attacksPerSecond ?? 0;
    const cooldownRecoveryRate =
      baseAttackRate > 0 ? stats.attacksPerSecond / baseAttackRate - 1 : -1;
    const attackIntervalMs =
      baseAttackRate > 0
        ? recoveryCooldownMs(MILLISECONDS_PER_SECOND / baseAttackRate, cooldownRecoveryRate)
        : Infinity;
    stats.attacksPerSecond = MILLISECONDS_PER_SECOND / attackIntervalMs;
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
      damageReduction: stats.armor / (ARMOR_FOR_HALF_REDUCTION + stats.armor),
    };
  }

  function syncEquipmentVitals(player: Player) {
    const stats = characterStats(player);
    player.maxHitpoints = stats.maxHitpoints;
    player.hitpoints = Math.min(player.hitpoints, player.maxHitpoints);
  }

  function companionStats(player: Player): CharacterStats {
    const packHowl =
      player.classId === 'druid' &&
      talentRank(player, talentNodeId('druid', PACK_HOWL.column, PACK_HOWL.row)) > 0;

    return {
      ...characterStats(player),
      damageType: BEAR_DEFINITION.damageType,
      range: BEAR_DEFINITION.range * (packHowl ? PACK_HOWL.multiplier : 1),
      manualRange: BEAR_DEFINITION.range * (packHowl ? PACK_HOWL.multiplier : 1),
      maxHitpoints:
        player.maxHitpoints *
        BEAR_DEFINITION.healthMultiplier *
        (packHowl ? PACK_HOWL.multiplier : 1),
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
