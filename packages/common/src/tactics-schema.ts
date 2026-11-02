import { z } from 'zod';
import { OFFENSIVE_PRIORITIES } from './offensive-priorities.ts';
import { DEFENSIVE_PRIORITIES } from './defensive-priorities.ts';
import { HEAL_THRESHOLDS } from './heal-thresholds.ts';
const priorities = <T extends string>(values: readonly [T, ...T[]]) => {
  return z
    .array(z.enum(values))
    .length(values.length)
    .refine((list) => {
      return new Set(list).size === values.length;
    });
};

export const tacticsSchema = z.object({
  offensive: priorities(OFFENSIVE_PRIORITIES),
  defensive: priorities(DEFENSIVE_PRIORITIES),
  keepTarget: z.boolean(),
  healBelow: z.union([
    z.literal(HEAL_THRESHOLDS.injured),
    z.literal(HEAL_THRESHOLDS.early),
    z.literal(HEAL_THRESHOLDS.quarterLost),
    z.literal(HEAL_THRESHOLDS.half),
  ]),
  includeCompanions: z.boolean(),
  stance: z.enum(['balanced', 'aggressive', 'protect', 'passive']),
  distance: z.enum(['close', 'medium', 'far']),
  companionTarget: z.enum(['priorities', 'assist', 'nearOwner']),
  avoidHazards: z.boolean(),
});
