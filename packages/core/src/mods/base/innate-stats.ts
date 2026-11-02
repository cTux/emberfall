import type { GearStats } from './gear-stats.ts';

// One hundred base HP is the existing fresh-character health budget; equipment supplies combat stats.
export const INNATE_STATS: GearStats = {
  power: 0,
  attacksPerSecond: 0,
  range: 0,
  manualRange: 0,
  criticalChance: 0,
  criticalMultiplier: 0,
  maxHitpoints: 100,
  armor: 0,
};
