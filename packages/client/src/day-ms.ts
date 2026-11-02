import { DAY_CYCLE } from './day-cycle.ts';
import { MILLISECONDS_PER_SECOND } from '@emberfall/core/contracts';

// Smoothstep uses the cubic 3t²-2t³ to join keyframes with zero slope at both endpoints.

export const DAY_MS =
  DAY_CYCLE.minutesPerHour * DAY_CYCLE.secondsPerMinute * MILLISECONDS_PER_SECOND;
