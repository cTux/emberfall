import { z } from 'zod';
export const id = z.string().min(1).max(128);
export const positive = z.number().finite().positive();
export const nonnegative = z.number().finite().nonnegative();
export const point = z.object({ x: z.number().finite(), y: z.number().finite() });
export const geometry = z.object({ width: positive, height: positive });
export const data = z.object({ id, value: z.unknown() });
