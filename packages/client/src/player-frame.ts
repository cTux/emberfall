import { ANIMATION } from './animation-tuning.ts';
import { actorFrame } from './actor-frame.ts';
import { ACTOR_ROWS } from './actor-rows.ts';

/** Player-only six-pose gait; action rows stay compatible with the enemy atlas. */
const playerWalkRows = [1, 2, 3, 4, 8, 9];

export function playerFrame(
  now: number,
  moving: boolean,
  alive: boolean,
  attackAt = -Infinity,
  duration: number = ANIMATION.attackMs,
) {
  const frame = actorFrame(now, moving, alive, attackAt, duration);

  if (frame === 0 || frame >= ACTOR_ROWS.windup) {
    return frame;
  }

  return playerWalkRows[
    Math.floor(Math.max(0, now) / ANIMATION.playerStepMs) % playerWalkRows.length
  ];
}
