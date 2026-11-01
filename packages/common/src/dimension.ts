/** Encounter variants share the same wrapped scene and travel lifecycle. */
export const DIMENSION_IDS = ['forest', 'swamp', 'desert'] as const;
export type DimensionId = (typeof DIMENSION_IDS)[number];
