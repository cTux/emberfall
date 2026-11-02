import { z } from 'zod';

export const storageNameSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[^\p{Cc}\p{Cf}]*$/u);
