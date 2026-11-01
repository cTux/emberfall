// Preserve the existing spawn budget/cadence and bounded placement work; no capacity benchmark is implied.
export const FOREST_ENCOUNTER = {
  id: 'forest',
  boss: 'hollowWarden',
  spawnIntervalMs: 400,
  bossPlacementAttempts: 256,
  spawnRadius: 340,
  spawnRingAttempts: 32,
  spawnRingSpacing: 40,
  // The existing rounded golden angle spreads retries around the ring without repeating a fixed spoke.
  spawnAngleStep: 2.399963,
  blockedSpawnRetryMs: 250,
} as const;
