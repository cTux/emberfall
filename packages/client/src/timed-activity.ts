import type { TimedActivity } from '@emberfall/common';
import { activityIndicator, ACTIVITY_ZONE_WIDTH } from '@emberfall/core';
import { drawWorldBar } from './world-bar.ts';

export function drawTimedActivity(
  ctx: CanvasRenderingContext2D,
  activity: TimedActivity,
  x: number,
  y: number,
  now: number,
) {
  const width = 120;
  const left = x - width / 2;
  const remaining = Math.max(0, activity.endsAt - now);
  ctx.save();
  drawWorldBar(ctx, left - 2, y + 9, width + 4, 1 - remaining / activity.durationMs, '#ebc34b');
  ctx.fillStyle = '#81df4b';
  ctx.fillRect(left + width * activity.zoneStart, y + 3, width * ACTIVITY_ZONE_WIDTH, 5);
  ctx.fillStyle = '#fff6dd';
  ctx.fillRect(left + width * activityIndicator(activity, now) - 0.75, y - 4, 1.5, 15);
  ctx.restore();
}
