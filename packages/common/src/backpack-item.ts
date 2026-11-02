import type { backpackSchema } from './backpack-schema.ts';
import type { z } from 'zod';

export type BackpackItem = z.infer<typeof backpackSchema>[number];
