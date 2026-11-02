import type { DimensionId } from '@emberfall/common';

export type NewDimension = Exclude<DimensionId, 'forest'>;
