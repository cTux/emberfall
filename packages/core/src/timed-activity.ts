import { randomSource } from './random.ts';
import type { TimedActivity } from '@emberfall/common';

// Existing fourteen-percent target width is the gathering timing difficulty calibration.
export const ACTIVITY_ZONE_WIDTH = 0.14;
// Existing 1.2-second traversal gives the timing indicator its established readable pace.
export const ACTIVITY_SWEEP_MS = 1200;
// A successful timing check removes two seconds from the existing five-second gather.
export const ACTIVITY_BONUS_MS = 2000;
// Accept at most half a second of late input while rejecting stale timing checks.
export const ACTIVITY_INPUT_WINDOW_MS = 500;
// A round-trip triangle wave has two traversals and changes direction at its halfway point.
const ACTIVITY_CYCLE = { traversals: 2, midpoint: 0.5 } as const;
// Existing starts keep targets within the sweep and move each successful target to its opposite half.
const ACTIVITY_ZONES = {
  initialMin: 0.1,
  initialSpan: 0.66,
  rightMin: 0.65,
  leftMin: 0.04,
  nextSpan: 0.17,
} as const;

export function activityIndicator(activity: TimedActivity, now: number) {
  const phase =
    (Math.max(0, now - activity.startedAt) / ACTIVITY_SWEEP_MS) % ACTIVITY_CYCLE.traversals;

  return phase <= 1 ? phase : ACTIVITY_CYCLE.traversals - phase;
}

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

export function checkTimedActivity(
  activity: TimedActivity,
  checkId: string,
  at: number,
  now: number,
  roll = randomSource.next,
) {
  if (
    checkId !== activity.checkId ||
    at < activity.zoneAt ||
    at < now - ACTIVITY_INPUT_WINDOW_MS ||
    at > now ||
    now >= activity.endsAt
  ) {
    return false;
  }

  const indicator = activityIndicator(activity, at);

  if (indicator < activity.zoneStart || indicator > activity.zoneStart + ACTIVITY_ZONE_WIDTH) {
    return false;
  }

  activity.endsAt -= ACTIVITY_BONUS_MS;
  activity.zoneStart =
    indicator < ACTIVITY_CYCLE.midpoint
      ? ACTIVITY_ZONES.rightMin + roll() * ACTIVITY_ZONES.nextSpan
      : ACTIVITY_ZONES.leftMin + roll() * ACTIVITY_ZONES.nextSpan;
  activity.zoneAt = now;
  activity.checkId = crypto.randomUUID();

  return true;
}
