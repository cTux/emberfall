import type { DimensionId } from '@emberfall/common';

export interface DimensionDefinition {
  id: DimensionId;
  name: string;
  enemyMultiplier: number;
  rarityMultiplier: number;
  enemies: readonly string[];
  boss: string;
  resources: { tree: string; plant: string; rock: string; stone: string };
}

// Requested dimension balance is independent of difficulty and cooperative membership scaling.
export const DIMENSIONS = {
  forest: {
    id: 'forest',
    name: 'Forest',
    enemyMultiplier: 1,
    rarityMultiplier: 1,
    enemies: ['skeleton', 'runner', 'brute', 'caster'],
    boss: 'hollowWarden',
    resources: { tree: 'log', plant: 'plant', rock: 'rock', stone: 'stone' },
  },
  swamp: {
    id: 'swamp',
    name: 'Swamp',
    enemyMultiplier: 1.2,
    rarityMultiplier: 1.3,
    enemies: ['mireling', 'bogToad', 'mossGolem'],
    boss: 'mireMatriarch',
    resources: {
      tree: 'bogwood',
      plant: 'marsh-reed',
      rock: 'peat-crystal',
      stone: 'peat-crystal',
    },
  },
  desert: {
    id: 'desert',
    name: 'Desert',
    enemyMultiplier: 1.4,
    rarityMultiplier: 1.6,
    enemies: ['scarab', 'sandWisp', 'duneColossus'],
    boss: 'sunstoneSovereign',
    resources: { tree: 'palmwood', plant: 'cactus-flower', rock: 'sunstone', stone: 'sunstone' },
  },
} as const satisfies Record<DimensionId, DimensionDefinition>;

export const DIMENSION_ITEMS = {
  bogwood: 'Bogwood',
  'marsh-reed': 'Marsh reed',
  'peat-crystal': 'Peat crystal',
  palmwood: 'Palmwood',
  'cactus-flower': 'Cactus flower',
  sunstone: 'Sunstone',
} as const;
