import type { progressSchema } from './progress-schema.ts';
import type { z } from 'zod';

export type CharacterProgress = z.infer<typeof progressSchema>;
