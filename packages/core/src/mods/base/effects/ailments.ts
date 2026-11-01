import type { DebuffKind } from '@emberfall/common';
import type { AilmentDefinition } from '../../../content/contracts.ts';
// Existing ailment balance: 10% proc chance, five-second refreshable duration and one damage/second/stack.
// Roots keep their separate one-stack 10% slow and boss immunity rather than scaling damage.
export const AILMENT_DEFINITIONS = {
  bleed: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  poison: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  burn: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  roots: { durationMs: 5000, maxStacks: 1, slowFraction: 0.1, affectsBoss: false },
  silence: { durationMs: 5000, maxStacks: 1 },
} as const satisfies Record<
  DebuffKind,
  Pick<AilmentDefinition, 'durationMs'> & Partial<AilmentDefinition>
>;
