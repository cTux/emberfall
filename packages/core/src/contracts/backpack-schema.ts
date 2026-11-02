import { inventoryItemSchema } from './inventory-item-schema.ts';
import { z } from 'zod';

export const backpackSchema = z.array(inventoryItemSchema).refine((items) => {
  return (
    new Set(
      items.map((item) => {
        return item.id;
      }),
    ).size === items.length
  );
}, 'Duplicate item identity');
