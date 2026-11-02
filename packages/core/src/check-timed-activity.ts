import { ACTIVITY_INPUT_WINDOW_MS } from './activity-input-window-ms.ts';
import { activityIndicator } from './activity-indicator.ts';
import { ACTIVITY_ZONE_WIDTH } from './activity-zone-width.ts';
import { ACTIVITY_BONUS_MS } from './activity-bonus-ms.ts';
import { ACTIVITY_CYCLE } from './activity-cycle.ts';
import { ACTIVITY_ZONES } from './activity-zones.ts';
import type { TimedActivity } from '@emberfall/core/contracts';

// Existing fourteen-percent target width is the gathering timing difficulty calibration.
import { randomSource } from './random.ts';

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
