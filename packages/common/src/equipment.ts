import { z } from 'zod';
export * from './content.ts';
export const equipmentSchema = z.record(
  z.string().min(1).max(128),
  z.string().min(1).max(128).nullable(),
);
