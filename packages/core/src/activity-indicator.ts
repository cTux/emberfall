import { ACTIVITY_SWEEP_MS } from './activity-sweep-ms.ts';
import { ACTIVITY_CYCLE } from './activity-cycle.ts';
import type { TimedActivity } from '@emberfall/core/contracts';

// Existing fourteen-percent target width is the gathering timing difficulty calibration.

export function activityIndicator(activity: TimedActivity, now: number) {
  const phase =
    (Math.max(0, now - activity.startedAt) / ACTIVITY_SWEEP_MS) % ACTIVITY_CYCLE.traversals;

  return phase <= 1 ? phase : ACTIVITY_CYCLE.traversals - phase;
}
