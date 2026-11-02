import type { GearType } from './gear-type.ts';
import type { DamageType } from './damage-type.ts';
import type { GearStats } from './gear-stats.ts';

export interface GearDefinition {
  id: string;
  name: string;
  gearType: GearType;
  damageType?: DamageType;
  stats: Partial<GearStats> & Record<string, number>;
  price?: number;
}
