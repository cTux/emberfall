import type { FighterState } from './fighter-state.ts';
import type { Player } from '@emberfall/common';

export const fighters = new WeakMap<Player, FighterState>();
