import type { DimensionId } from '@emberfall/common';
import { game, type createGame } from './game.ts';
import type { DimensionDefinition } from './mods/dimensions/definitions.ts';

export function dimensionDefinition(
  id: DimensionId = 'forest',
  context: ReturnType<typeof createGame> = game,
): Readonly<DimensionDefinition> {
  const definitions = context.registries.settings.get('dimensions')?.value as
    | Record<DimensionId, DimensionDefinition>
    | undefined;

  // Base-only contexts retain the original forest content for extension fixtures.
  if (!definitions && id === 'forest') {
    return {
      id,
      name: 'Forest',
      enemyMultiplier: 1,
      rarityMultiplier: 1,
      enemies: ['skeleton', 'runner', 'brute', 'caster'],
      boss: 'hollowWarden',
      resources: { tree: 'log', plant: 'plant', rock: 'rock', stone: 'stone' },
    };
  }

  if (!definitions?.[id]) {
    throw new Error(`Unknown dimension '${id}'`);
  }

  return definitions[id];
}
