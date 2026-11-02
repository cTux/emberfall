import { type createGame, game } from './game.ts';
import type { Enemy } from '@emberfall/core/contracts';
import { dimensionDefinition } from './dimensions.ts';

export function spawnArchetype(
  roll: number,
  count: number,
  context: ReturnType<typeof createGame> = game,
  dimension: import('@emberfall/core/contracts').DimensionId = 'forest',
): NonNullable<Enemy['archetype']> {
  let threshold = 0;

  for (const rule of context.registries.spawnRules.values()) {
    if ((rule.dimension ?? 'forest') !== dimension) {
      continue;
    }

    threshold += rule.chance;

    if (roll < threshold) {
      return rule.enemy;
    }
  }

  if (dimension !== 'forest') {
    const enemies = dimensionDefinition(dimension, context).enemies;

    return enemies[count % enemies.length];
  }

  const fallbacks = context.registries.settings.require('spawnFallbacks')
    .value as readonly string[];

  return fallbacks[count % fallbacks.length];
}
