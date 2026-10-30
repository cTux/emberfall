import { ATTACK_DEFINITIONS } from '../definitions/abilities/attacks.ts';
import { RUNTIME } from '../definitions/runtime.ts';
import { defaultSpellRange } from '../class-combat.ts';

export const TICK_MS = RUNTIME.tickMs;
export const PLAYER_ATTACK_RANGE = defaultSpellRange({ classId: 'warrior' });
export const PLAYER_ATTACK_INTERVAL = ATTACK_DEFINITIONS.slash.intervalMs;
export const PLAYER_ATTACK_DURATION = ATTACK_DEFINITIONS.slash.durationMs;
