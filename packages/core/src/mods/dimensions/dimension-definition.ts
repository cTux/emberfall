import type { DimensionId } from '@emberfall/core/contracts';

export interface DimensionDefinition {
  id: DimensionId;
  name: string;
  enemyMultiplier: number;
  rarityMultiplier: number;
  enemies: readonly string[];
  boss: string;
  resources: { tree: string; plant: string; rock: string; stone: string };
}
