import { z } from 'zod';

export const OFFENSIVE_PRIORITIES = ['nearest', 'lowestHealth', 'elite'] as const;
export const DEFENSIVE_PRIORITIES = ['lowestHealth', 'players', 'self'] as const;
const priorities = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .array(z.enum(values))
    .length(values.length)
    .refine((list) => new Set(list).size === values.length);

export const tacticsSchema = z.object({
  offensive: priorities(OFFENSIVE_PRIORITIES),
  defensive: priorities(DEFENSIVE_PRIORITIES),
  keepTarget: z.boolean(),
  healBelow: z.union([z.literal(1), z.literal(0.9), z.literal(0.75), z.literal(0.5)]),
  includeCompanions: z.boolean(),
  stance: z.enum(['balanced', 'aggressive', 'protect', 'passive']),
  distance: z.enum(['close', 'medium', 'far']),
  companionTarget: z.enum(['priorities', 'assist', 'nearOwner']),
  avoidHazards: z.boolean(),
});
export type Tactics = z.infer<typeof tacticsSchema>;
export const DEFAULT_TACTICS: Tactics = {
  offensive: ['nearest', 'lowestHealth', 'elite'],
  defensive: ['lowestHealth', 'players', 'self'],
  keepTarget: false,
  healBelow: 1,
  includeCompanions: true,
  stance: 'balanced',
  distance: 'medium',
  companionTarget: 'priorities',
  avoidHazards: true,
};
