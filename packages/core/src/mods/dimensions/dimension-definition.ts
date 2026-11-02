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
