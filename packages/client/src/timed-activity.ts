import type { DrawingContext } from './rendering/drawing-context';
import type { TimedActivity } from '@emberfall/common';
import { activityIndicator, ACTIVITY_ZONE_WIDTH } from '@emberfall/core';
import { drawWorldBar } from './world-bar.ts';

// Keep the existing 120-unit timing gauge and marker alignment above the gathering target.
const ACTIVITY_GAUGE = {
  width: 120,
  horizontalPadding: 2,
  progressY: 9,
  progressExtraWidth: 4,
  zoneY: 3,
  zoneHeight: 5,
  markerHalfWidth: 0.75,
  markerY: 4,
  markerWidth: 1.5,
  markerHeight: 15,
};

export function drawTimedActivity(
  ctx: DrawingContext,
  activity: TimedActivity,
  x: number,
  y: number,
  now: number,
) {
  const width = ACTIVITY_GAUGE.width;
  const left = x - width / 2;
  const remaining = Math.max(0, activity.endsAt - now);
  ctx.save();
  drawWorldBar(
    ctx,
    left - ACTIVITY_GAUGE.horizontalPadding,
    y + ACTIVITY_GAUGE.progressY,
    width + ACTIVITY_GAUGE.progressExtraWidth,
    1 - remaining / activity.durationMs,
    '#ebc34b',
  );
  ctx.fillStyle = '#81df4b';
  ctx.fillRect(
    left + width * activity.zoneStart,
    y + ACTIVITY_GAUGE.zoneY,
    width * ACTIVITY_ZONE_WIDTH,
    ACTIVITY_GAUGE.zoneHeight,
  );
  ctx.fillStyle = '#fff6dd';
  ctx.fillRect(
    left + width * activityIndicator(activity, now) - ACTIVITY_GAUGE.markerHalfWidth,
    y - ACTIVITY_GAUGE.markerY,
    ACTIVITY_GAUGE.markerWidth,
    ACTIVITY_GAUGE.markerHeight,
  );
  ctx.restore();
}
