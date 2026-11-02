// Eight particles cap per-worker work; the retained 1.8 s drift and 1.6 s action cycles align with the existing work poses.
export const WORK_PARTICLES = {
  count: 8,
  seedIndex: 127.1,
  seedStation: 311.7,
  seedScale: 43758.5453,
  phaseOffsetMs: 211,
  driftMs: 1800,
  actionMs: 1600,
  spread: 9,
  height: 24,
  rise: 20,
  alpha: 0.8,
};
