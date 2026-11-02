// Existing portal/smoke choreography: three orbiting motes, five staggered chimney puffs and slow fixed periods.
export const AMBIENT = {
  portalCell: 128,
  portalMotes: 3,
  portalOrbitMs: 2300,
  portalAlpha: 0.38,
  smokePuffs: 5,
  smokeStaggerMs: 1700,
  smokeLifetimeMs: 8500,
  smokeSize: 8,
  smokeGrowth: 17,
  smokeAlpha: 0.19,
  smokeSwayFrequency: 5,
} as const;
