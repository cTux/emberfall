// Preserve the existing talent-ailment balance and tooltip contract; the original
// calibration of these chances, caps, radii and durations is undocumented.
export const TALENT_AILMENTS = {
  durationMs: 5000,
  tickMs: 1000,
  maxStacks: 5,
  bleedChance: [0.2, 0.35],
  spreadRadius: 180,
  spreadTargets: [2, 4],
} as const;
