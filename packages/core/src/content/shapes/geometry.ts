import { positive } from './positive.ts';
import { z } from 'zod';
// Keep registered IDs within the 128-character contract enforced by validId's ASCII pattern.

export const geometry = z.object({ width: positive, height: positive });
