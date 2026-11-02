import { z } from 'zod';
// Keep registered IDs within the 128-character contract enforced by validId's ASCII pattern.

export const nonnegative = z.number().finite().nonnegative();
