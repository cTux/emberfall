import { ACTIVITY_ZONES } from './activity-zones.ts';
import { randomSource } from './random.ts';
import type { TimedActivity } from '@emberfall/core/contracts';

// Existing fourteen-percent target width is the gathering timing difficulty calibration.

export function startTimedActivity(
  now: number,
  durationMs: number,
  roll = randomSource.next,
): TimedActivity {
  return {
    startedAt: now,
    endsAt: now + durationMs,
    durationMs,
    zoneStart: ACTIVITY_ZONES.initialMin + roll() * ACTIVITY_ZONES.initialSpan,
    zoneAt: now,
    checkId: crypto.randomUUID(),
  };
}
