// Keep recent hit bursts readable on Low while bounding the number of submitted particles.
export const HIT_BURST = {
  recentHits: 80,
  durationSeconds: 0.6,
  particles: 12,
  // Existing rounded golden angle spreads particles without aligned spokes.
  angleStep: 2.399963,
  // Deterministic index scrambling preserves each burst's existing velocity variation.
  minimumSpeed: 20,
  speedSeed: 13,
  speedRange: 43,
  brightParticleEvery: 3,
  // Preserve the existing launch height, upward speed and quadratic gravity arc.
  launchHeight: 5,
  upwardSpeed: 30,
  gravity: 65,
  particleWidth: 2,
  brightParticleWidth: 3,
} as const;
