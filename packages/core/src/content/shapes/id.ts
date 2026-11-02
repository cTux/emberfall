import { z } from 'zod';
// Keep registered IDs within the 128-character contract enforced by validId's ASCII pattern.
// Keep registered IDs within the 128-character contract enforced by validId's ASCII pattern.
const MAX_CONTENT_ID_LENGTH = 128;
export const id = z.string().min(1).max(MAX_CONTENT_ID_LENGTH);
