import { ANIMATION } from './animation-tuning.ts';
import { ACTOR_ROWS } from './actor-rows.ts';

export function actorFrame(
  now: number,
  moving: boolean,
  alive: boolean,
  attackAt = -Infinity,
  duration: number = ANIMATION.attackMs,
) {
  if (!alive) {
    return ACTOR_ROWS.fallen;
  }

  const age = now - attackAt;

  if (age >= 0 && age < duration) {
    return age < duration * ANIMATION.windupFraction ? ACTOR_ROWS.windup : ACTOR_ROWS.release;
  }

  return moving
    ? 1 + (Math.floor(Math.max(0, now) / ANIMATION.enemyStepMs) % ANIMATION.enemySteps)
    : 0;
}
