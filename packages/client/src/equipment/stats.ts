import { characterStats } from '@emberfall/core';
import type { Player } from '@emberfall/common';
import type { EquipmentStatView } from '@emberfall/ui';
import { additionalStatViews } from '../content-views';
import { number, percent, capitalize } from './metadata';

export function equipmentStatRows(player: Player): EquipmentStatView[] {
  const stats = characterStats(player);
  return [
    { label: 'Power', value: number(stats.power) },
    { label: 'Damage type', value: stats.hasWeapon ? capitalize(stats.damageType) : '—' },
    { label: 'Cooldown', value: `${number(stats.attackIntervalMs / 1000)} sec` },
    { label: 'DOT Speed', value: `${number(stats.bonuses.dotSpeed)}%` },
    {
      label: 'Range',
      value: `${number(player.autoTarget === false ? stats.manualRange : stats.range)} units`,
    },
    { label: 'Critical chance', value: percent(stats.criticalChance) },
    { label: 'Critical damage', value: percent(stats.criticalMultiplier) },
    { label: 'Maximum health', value: number(stats.maxHitpoints) },
    { label: 'Armor', value: number(stats.armor) },
    { label: 'Damage reduction', value: percent(stats.damageReduction) },
    ...additionalStatViews(player),
  ];
}
