import type { DimensionId } from '@emberfall/core/contracts';

export type NewDimension = Exclude<DimensionId, 'forest'>;
