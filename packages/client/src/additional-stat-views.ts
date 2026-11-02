import { type CharacterStats, type createGame, game } from '@emberfall/core';
import { PERCENT } from '@emberfall/core/contracts';

export function additionalStatViews(
  stats: CharacterStats,
  context: ReturnType<typeof createGame> = game,
) {
  return context.registries.stats
    .values()
    .filter((stat) => {
      return ![
        'power',
        'attacksPerSecond',
        'range',
        'manualRange',
        'criticalChance',
        'criticalMultiplier',
        'maxHitpoints',
        'armor',
      ].includes(stat.id);
    })
    .map((stat) => {
      return {
        label: stat.label,
        value: `${(stats.attributes[stat.id] * (stat.format === 'percent' ? PERCENT : 1)).toLocaleString('en', { maximumFractionDigits: 2 })}${stat.format === 'percent' ? '%' : ''}`,
      };
    });
}
