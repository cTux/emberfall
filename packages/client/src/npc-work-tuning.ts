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
// Preserve the approved workstation particle shapes; these are visual calibration, not simulation or reward rules.
export const COOKING = { wobbleRate: 5, wobbleWidth: 4, alpha: 0.45 };
export const BREWING = {
  spread: 7,
  wobbleRate: 4,
  height: 28,
  rise: 16,
  radius: 0.7,
  growth: 1.5,
  stroke: 0.7,
};
export const ALCHEMY = { orbitRate: 8, spread: 3, growth: 8, height: 25, rise: 25, radius: 1.1 };
export const WRITING = { startX: 5, travel: 12, height: 18, spread: 3, arc: 3, radius: 0.7 };
export const FORGING = {
  startsAt: 0.45,
  endsAt: 0.8,
  flight: 0.35,
  spread: 23,
  height: 18,
  arc: 9,
  fall: 6,
  radius: 1.2,
  shrink: 0.6,
};
export const SMELTING = { spread: 4, growth: 10, height: 20, acceleration: 34, radius: 1.5 };
export const ARCHERY = {
  startsAt: 0.4,
  endsAt: 0.95,
  flight: 0.45,
  arrowParticles: 4,
  spacing: 1.2,
  dustSpread: 10,
  arrowHeight: 26,
  targetHeight: 8,
  dustHeight: 18,
  dustRise: 8,
  radius: 0.8,
};
export const LEATHERWORKING = {
  spread: 4,
  growth: 12,
  height: 23,
  fall: 23,
  radius: 0.8,
  sizeVariants: 3,
  sizeStep: 0.2,
};
