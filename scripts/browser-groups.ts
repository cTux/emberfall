export const browserGroups = {
  session: { files: ['tests/reconnect.spec.ts', 'tests/server-version.spec.ts'] },
  inventory: {
    files: ['tests/equipment.spec.ts', 'tests/trade-quantity.spec.ts'],
    grep: '^(?:.* )?(?:inventory tabs preserve the bag, aligned square gear and calculated stat totals|trade modifiers apply to buying, selling, buyback, keyboard and vendor drops)$',
  },
  combat: {
    files: ['tests/gameplay.spec.ts', 'tests/damage-flash.spec.ts', 'tests/damage-numbers.spec.ts'],
  },
  controls: { files: ['tests/ability-effects.spec.ts', 'tests/tactics.spec.ts'] },
  rendering: {
    files: [
      'tests/rendering.spec.ts',
      'tests/renderer-lifetime.spec.ts',
      'tests/day-night.spec.ts',
      'tests/generated-art.spec.ts',
      'tests/buildings.spec.ts',
      'tests/terrain-loading.spec.ts',
      'tests/art-assets.spec.ts',
      'tests/entity-layering.spec.ts',
    ],
  },
  loading: { files: ['tests/code-splitting.spec.ts'] },
  npcs: {
    files: ['tests/npcs.spec.ts'],
    grep: 'Marta walks near a player, stops for trading|LLM outage gives every villager|eight home workstations render',
  },
} as const;
