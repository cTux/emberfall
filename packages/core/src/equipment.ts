import { PERCENT } from '@emberfall/common';
import { game } from './game.ts';
import type { CharacterStats, EquipmentOwner } from './content/rules.ts';
import { recoveryCooldownMs } from './utils/recoveryCooldownMs.ts';

export function dotTickIntervalMs(
  player: EquipmentOwner,
  baseMs: number,
  stats: CharacterStats = game.rules.characterStats(player),
) {
  return recoveryCooldownMs(baseMs, stats.bonuses.dotSpeed / PERCENT);
}

export * from './definitions/equipment.ts';
export type { CharacterStats, EquipmentOwner } from './content/rules.ts';
export const {
  canEquip,
  equipmentSchema,
  starterEquipment,
  validateClassEquipment,
  equippedItems,
  characterStats,
  syncEquipmentVitals,
  companionStats,
} = game.rules;
