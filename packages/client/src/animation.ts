// Atlas row IDs are fixed by the packaged eight-row actor sheets.
const ACTOR_ROWS = { idle: 0, windup: 5, release: 6, fallen: 7 } as const;
// Existing gait calibration keeps the four enemy poses at 120 ms and six player poses at 80 ms.
const ANIMATION = {
  attackMs: 260,
  windupFraction: 0.4,
  enemyStepMs: 120,
  enemySteps: 4,
  playerStepMs: 80,
  releaseMs: 180,
  breathMs: 550,
  breathScale: 0.012,
} as const;

/** Presentation-only atlas rows; timestamps come from the existing action state. */
export const ACTOR_CELL = 64;
export const idleBreath = (now: number, row: number) => {
  return row === 0 ? 1 + Math.sin(now / ANIMATION.breathMs) * ANIMATION.breathScale : 1;
};

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
