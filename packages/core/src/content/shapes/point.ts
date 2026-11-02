import { z } from 'zod';
// Keep registered IDs within the 128-character contract enforced by validId's ASCII pattern.

export const point = z.object({ x: z.number().finite(), y: z.number().finite() });
