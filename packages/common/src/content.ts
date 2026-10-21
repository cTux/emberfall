export type ClassId = string;
export type EquipmentSlot = string;
export type GearType = string;
export type Equipment = Record<EquipmentSlot, string | null>;
export type DamageType = 'physical' | 'fire' | 'poison' | 'nature';
export interface GearStats {
  power: number;
  attacksPerSecond: number;
  range: number;
  manualRange: number;
  criticalChance: number;
  criticalMultiplier: number;
  maxHitpoints: number;
  armor: number;
}
export interface GearDefinition {
  id: string;
  name: string;
  gearType: GearType;
  damageType?: DamageType;
  stats: Partial<GearStats> & Record<string, number>;
  price?: number;
}
