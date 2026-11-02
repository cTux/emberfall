import type { DimensionId } from '@emberfall/core/contracts';

export interface ResourceNode {
  id: string;
  dimension?: DimensionId;
  kind: 'tree' | 'plant' | 'rock' | 'stone';
  x: number;
  y: number;
  size: number;
  variant?: number;
}
