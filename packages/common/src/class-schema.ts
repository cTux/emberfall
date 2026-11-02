import { z } from 'zod';
import { CONTRACT_LIMITS } from './limits.ts';

export const classSchema = z.string().min(1).max(CONTRACT_LIMITS.contentIdCharacters);
