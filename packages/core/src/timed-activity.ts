import type { TimedActivity } from '@emberfall/common';

export const ACTIVITY_ZONE_WIDTH = 0.14;
export const ACTIVITY_SWEEP_MS = 1200;
export const ACTIVITY_BONUS_MS = 2000;
export const ACTIVITY_INPUT_WINDOW_MS = 500;

export function activityIndicator(activity: TimedActivity, now: number) {
  const phase = (Math.max(0, now - activity.startedAt) / ACTIVITY_SWEEP_MS) % 2;

  return phase <= 1 ? phase : 2 - phase;
}

export function startTimedActivity(
  now: number,
  durationMs: number,
  roll = Math.random,
): TimedActivity {
  return {
    startedAt: now,
    endsAt: now + durationMs,
    durationMs,
    zoneStart: 0.1 + roll() * 0.66,
    zoneAt: now,
    checkId: crypto.randomUUID(),
  };
}

export function checkTimedActivity(
  activity: TimedActivity,
  checkId: string,
  at: number,
  now: number,
  roll = Math.random,
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
  activity.zoneStart = indicator < 0.5 ? 0.65 + roll() * 0.17 : 0.04 + roll() * 0.17;
  activity.zoneAt = now;
  activity.checkId = crypto.randomUUID();

  return true;
}
