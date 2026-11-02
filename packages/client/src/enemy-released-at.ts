/** Replicated cooldown deadlines include the dimension's attack-speed factor. */
export function enemyReleasedAt(
  cooldownUntil: number | undefined,
  cooldownMs: number,
  speed: number,
) {
  return (cooldownUntil ?? -Infinity) - cooldownMs / speed;
}
