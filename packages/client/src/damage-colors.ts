import type { DamageType } from '@emberfall/core/contracts';

// Existing combat-label calibration gives each number a fixed 750 ms flight and short initial pop.

export const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: '#fff0b1',
  fire: '#ff9d48',
  poison: '#c6e85a',
  nature: '#61dba3',
};
