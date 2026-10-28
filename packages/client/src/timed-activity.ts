import type { TimedActivity } from '@emberfall/common';
import { activityIndicator, ACTIVITY_ZONE_WIDTH } from '@emberfall/core';

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
  ctx.fillStyle = '#28271b';
  ctx.fillRect(left - 2, y - 2, width + 4, 11);
  ctx.fillStyle = '#695a31';
  ctx.fillRect(left, y, width, 7);
  ctx.fillStyle = '#ebc34b';
  ctx.fillRect(left, y, width * Math.max(0, Math.min(1, 1 - remaining / activity.durationMs)), 7);
  ctx.fillStyle = '#81df4b';
  ctx.fillRect(left + width * activity.zoneStart, y, width * ACTIVITY_ZONE_WIDTH, 7);
  ctx.fillStyle = '#fff6dd';
  ctx.fillRect(left + width * activityIndicator(activity, now) - 0.75, y - 4, 1.5, 15);
  ctx.font = '10px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.strokeStyle = '#202318';
  ctx.lineWidth = 3;
  const time = `${(remaining / 1000).toFixed(1)}s`;
  ctx.strokeText(time, x, y - 6);
  ctx.fillText(time, x, y - 6);
  ctx.font = '9px "Alegreya Sans", sans-serif';
  ctx.textBaseline = 'top';
  ctx.strokeText('E  Hit green: −2s', x, y + 13);
  ctx.fillText('E  Hit green: −2s', x, y + 13);
  ctx.restore();
}
