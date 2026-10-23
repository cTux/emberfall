/** Net recovery is a fraction: +1 doubles recovery; -1 stops it entirely. */
export function recoveryCooldownMs(baseMs: number, recoveryRate: number) {
  return recoveryRate > -1 ? baseMs / (1 + recoveryRate) : Infinity;
}
