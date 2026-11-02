import { z } from 'zod';
import { positive } from './primitives.ts';

// Match the wire chat schema's existing 200-character ceiling; mods can only lower it.

export const effectShapes = {
  damage: z.object({ id: z.literal('damage'), lifetimeMs: positive }),
  explosion: z.object({ id: z.literal('explosion'), lifetimeMs: positive, radius: positive }),
  blood: z.object({ id: z.literal('blood'), lifetimeMs: positive }),
  hitFlash: z.object({ id: z.literal('hit-flash'), lifetimeMs: positive }),
};
