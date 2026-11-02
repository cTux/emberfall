import type { NewDimension } from './new-dimension.ts';

export const DIMENSION_ITEM_ART: Record<string, { dimension: NewDimension; column: number }> = {
  bogwood: { dimension: 'swamp', column: 0 },
  'marsh-reed': { dimension: 'swamp', column: 1 },
  'peat-crystal': { dimension: 'swamp', column: 2 },
  palmwood: { dimension: 'desert', column: 0 },
  'cactus-flower': { dimension: 'desert', column: 1 },
  sunstone: { dimension: 'desert', column: 2 },
};
