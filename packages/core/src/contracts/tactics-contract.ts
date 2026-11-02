import type { tacticsSchema } from './tactics-schema.ts';
import type { z } from 'zod';

export type Tactics = z.infer<typeof tacticsSchema>;
