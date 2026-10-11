/** Presentation-only atlas rows; timestamps come from the existing action state. */
export const ACTOR_CELL = 64;
export const idleBreath = (now: number, row: number) =>
  row === 0 ? 1 + Math.sin(now / 550) * 0.012 : 1;
export function actorFrame(
  now: number,
  moving: boolean,
  alive: boolean,
  attackAt = -Infinity,
  duration = 260,
) {
  if (!alive) return 7;
  const age = now - attackAt;
  if (age >= 0 && age < duration) return age < duration * 0.4 ? 5 : 6;
  return moving ? 1 + (Math.floor(Math.max(0, now) / 120) % 4) : 0;
}

export function enemyFrame(
  now: number,
  moving: boolean,
  alive: boolean,
  attack?: { startedAt: number; endsAt: number },
  releasedAt = -Infinity,
) {
  if (!alive) return 7;
  if (attack && now >= attack.startedAt && now < attack.endsAt) return 5;
  if (now >= releasedAt && now - releasedAt < 180) return 6;
  return actorFrame(now, moving, alive);
}

/** Player-only six-pose gait; action rows stay compatible with the enemy atlas. */
const playerWalkRows = [1, 2, 3, 4, 8, 9];
export function playerFrame(
  now: number,
  moving: boolean,
  alive: boolean,
  attackAt = -Infinity,
  duration = 260,
) {
  const frame = actorFrame(now, moving, alive, attackAt, duration);
  if (frame === 0 || frame >= 5) return frame;
  return playerWalkRows[Math.floor(Math.max(0, now) / 80) % playerWalkRows.length];
}
