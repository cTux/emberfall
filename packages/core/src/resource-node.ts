import type { DimensionId } from '@emberfall/common';

export interface ResourceNode {
  id: string;
  dimension?: DimensionId;
  kind: 'tree' | 'plant' | 'rock' | 'stone';
  x: number;
  y: number;
  size: number;
  variant?: number;
}
