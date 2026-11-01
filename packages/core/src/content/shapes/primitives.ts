import { z } from 'zod';
// Keep registered IDs within the 128-character contract enforced by validId's ASCII pattern.
const MAX_CONTENT_ID_LENGTH = 128;
export const id = z.string().min(1).max(MAX_CONTENT_ID_LENGTH);
export const positive = z.number().finite().positive();
export const nonnegative = z.number().finite().nonnegative();
export const point = z.object({ x: z.number().finite(), y: z.number().finite() });
export const geometry = z.object({ width: positive, height: positive });
export const data = z.object({ id, value: z.unknown() });
