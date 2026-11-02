import type { FighterState } from './fighter-state.ts';
import type { Player } from '@emberfall/core/contracts';

export const fighters = new WeakMap<Player, FighterState>();
