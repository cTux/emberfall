import { ACTOR_ROWS } from './actor-rows.ts';
import { ANIMATION } from './animation-tuning.ts';
import { actorFrame } from './actor-frame.ts';

export function enemyFrame(
  now: number,
  moving: boolean,
  alive: boolean,
  attack?: { startedAt: number; endsAt: number },
  releasedAt = -Infinity,
) {
  if (!alive) {
    return ACTOR_ROWS.fallen;
  }

  if (attack && now >= attack.startedAt && now < attack.endsAt) {
    return ACTOR_ROWS.windup;
  }

  if (now >= releasedAt && now - releasedAt < ANIMATION.releaseMs) {
    return ACTOR_ROWS.release;
  }

  return actorFrame(now, moving, alive);
}
