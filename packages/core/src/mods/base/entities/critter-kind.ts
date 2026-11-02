import type { CRITTER_DEFINITIONS } from './critter-definitions.ts';

export type CritterKind = keyof typeof CRITTER_DEFINITIONS;
