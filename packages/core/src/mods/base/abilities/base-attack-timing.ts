// Existing attack cadence and presentation calibration: one attack/second, 260 ms swing, 80 ms aim easing.
export const BASE_ATTACK_TIMING = {
  intervalMs: 1000,
  durationMs: 260,
  aimSmoothingSeconds: 0.08,
} as const;
