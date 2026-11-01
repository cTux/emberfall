import { z } from 'zod';
import { CONTRACT_LIMITS } from './limits.ts';
export * from './content.ts';
export const equipmentSchema = z.record(
  z.string().min(1).max(CONTRACT_LIMITS.contentIdCharacters),
  z.string().min(1).max(CONTRACT_LIMITS.contentIdCharacters).nullable(),
);
