import type { DimensionId } from '@emberfall/common';
export type NewDimension = Exclude<DimensionId, 'forest'>;
export const DIMENSION_SPRITES = {
  mireling: { dimension: 'swamp', column: 0 },
  bogToad: { dimension: 'swamp', column: 1 },
  mossGolem: { dimension: 'swamp', column: 2 },
  scarab: { dimension: 'desert', column: 0 },
  sandWisp: { dimension: 'desert', column: 1 },
  duneColossus: { dimension: 'desert', column: 2 },
} as const;
export const DIMENSION_ITEM_ART: Record<string, { dimension: NewDimension; column: number }> = {
  bogwood: { dimension: 'swamp', column: 0 },
  'marsh-reed': { dimension: 'swamp', column: 1 },
  'peat-crystal': { dimension: 'swamp', column: 2 },
  palmwood: { dimension: 'desert', column: 0 },
  'cactus-flower': { dimension: 'desert', column: 1 },
  sunstone: { dimension: 'desert', column: 2 },
};
// Each large source sheet uses three equal columns; scenery has intact/depleted rows.
export const DIMENSION_ATLAS = {
  columns: 3,
  sceneryRows: 2,
  enemyRows: 5,
  actorCell: 64,
  backing: 2,
  // Normalized source frames place feet at pixel 464 of each 512px cell.
  footAnchor: 464 / 512,
} as const;
