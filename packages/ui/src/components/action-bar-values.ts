// The radial sweep encloses the corners of its 100-unit square (radius exceeds its half diagonal).
export const COOLDOWN_ARC = { center: 50, radius: 72, halfTurn: 0.5 };
// Milliseconds per second and per tenth keep the existing whole/tenth-second countdown format.
export const COOLDOWN_TIME = { secondMs: 1000, tenthMs: 100, tenthsPerSecond: 10 };
// Four ordinal slots match the displayed keyboard shortcuts, separate from the base attack.
export const TALENT_SLOTS = { first: 1, second: 2, third: 3, fourth: 4 } as const;

export function cooldownTenths(milliseconds: number) {
  return Math.round(milliseconds / COOLDOWN_TIME.tenthMs) / COOLDOWN_TIME.tenthsPerSecond;
}
