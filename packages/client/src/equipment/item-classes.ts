import { STARTER_WEAPONS } from '@emberfall/core';
import type { ClassId } from '@emberfall/core/contracts';

export const ITEM_CLASSES = Object.fromEntries(
  Object.entries(STARTER_WEAPONS).map(([id, weapon]) => {
    return [weapon, id];
  }),
) as Record<string, ClassId>;
