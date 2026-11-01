import type { GearDefinition, DebuffKind, DamageType } from '@emberfall/common';

export type Widen<T> = T extends number
  ? number
  : T extends string
    ? string
    : T extends boolean
      ? boolean
      : { -readonly [K in keyof T]: Widen<T[K]> };
export type AbilityKind = 'slash' | 'arrow' | 'fireball' | 'roots';
export type ClassArt = 'warrior' | 'ranger' | 'mage' | 'druid';
export type EnemyArt = 'skeleton' | 'runner' | 'brute' | 'caster';
export interface StatDefinition {
  id: string;
  label: string;
  default: number;
  aggregation: 'sum';
  format: 'number' | 'percent';
}
export interface SlotDefinition {
  id: string;
  label: string;
  gearTypes: readonly string[];
  classRestricted?: boolean;
  column: number;
  row: number;
}
export interface BaseItemDefinition {
  id: string;
  name: string;
  price?: number;
}
export interface GearItemDefinition extends GearDefinition {
  kind: 'gear';
  loot?: boolean;
}
export interface ConsumableDefinition extends BaseItemDefinition {
  kind: 'consumable';
  healing: number;
}
export interface ResourceDefinition extends BaseItemDefinition {
  kind: 'resource';
}
export type ItemDefinition = GearItemDefinition | ConsumableDefinition | ResourceDefinition;
export interface ClassDefinition {
  id: string;
  label: string;
  attack: string;
  ailment: DebuffKind;
  companion?: string;
  sprite: string;
  art: ClassArt;
  starterWeapon: string;
  details?: { weapon: string; weaponDescription: string; spell: string; spellDescription: string };
  gearTypes: readonly string[];
}
export interface AbilityDefinition {
  id: string;
  range: number;
  damage: number;
  intervalMs: number;
  durationMs: number;
  aimSmoothingSeconds: number;
  kind: AbilityKind;
  name?: string;
  classId?: string;
  talentSlot?: number;
  powerScale?: number;
  manualRange: number;
  speed: number;
  count: number;
  spreadRadians: number;
  piercing: boolean;
  pierce?: number;
  splashRadius: number;
  splashDamage: number;
  bounces: number;
  bounceRadius: number;
}
export type EnemySkill =
  | { name: string; kind: 'ground'; radius: number; targeted: boolean }
  | { name: string; kind: 'volley'; count: number; spread: number };
export interface EnemyDefinition {
  sprite?: 'mireling' | 'bogToad' | 'mossGolem' | 'scarab' | 'sandWisp' | 'duneColossus';
  skill?: EnemySkill;
  speed: number;
  radius: number;
  size: number;
  reach: number;
  windup: number;
  cooldown: number;
  id: string;
  behavior: 'melee' | 'ranged';
  art: EnemyArt;
  hitPoints: number;
  damage: number;
}
export interface CompanionDefinition {
  id: string;
  name: string;
  sprite: string;
  healthMultiplier: number;
  damageType: DamageType;
  range: number;
  huntRadius: number;
  spacing: number;
  returnRadius: number;
  teleportRadius: number;
  decisionMs: number;
  resurrectionMs: number;
  attack: string;
}
export interface AilmentDefinition {
  chance: number;
  durationMs: number;
  tickMs: number;
  damagePerStack: number;
  id: string;
  kind: DebuffKind;
  maxStacks?: number;
  slowFraction?: number;
  affectsBoss?: boolean;
}
export interface DataDefinition {
  id: string;
  value: unknown;
}
export interface ContentTypes {
  items: ItemDefinition;
  gearTypes: { id: string; label: string };
  slots: SlotDefinition;
  stats: StatDefinition;
  classes: ClassDefinition;
  abilities: AbilityDefinition;
  enemies: EnemyDefinition;
  spawnRules: {
    id: string;
    enemy: string;
    chance: number;
    dimension?: import('@emberfall/common').DimensionId;
  };
  companions: CompanionDefinition;
  ailments: AilmentDefinition;
  bosses: { id: string; name: string; archetype: string; kind: 'boss' };
  pickups: DataDefinition;
  encounters: DataDefinition;
  worlds: DataDefinition;
  critters: { id: string; sprite: string };
  effects: DataDefinition;
  settings: DataDefinition;
  enemyTypes: {
    id: string;
    multiplier: number;
    dropChance: number;
    dropCount: number | { min: number; max: number };
    spawnChance?: number;
  };
  difficulties: { id: string; multiplier: number; speedMultiplier: number };
}
export type RegistryName = keyof ContentTypes;
export interface Registry<T> {
  readonly size: number;
  has(id: string): boolean;
  get(id: string): Readonly<T> | undefined;
  require(id: string): Readonly<T>;
  values(): readonly Readonly<T>[];
  entries(): readonly (readonly [string, Readonly<T>])[];
}
export type Registries = { readonly [K in RegistryName]: Registry<ContentTypes[K]> };
export type Registration = {
  readonly [K in RegistryName]: { register(definition: ContentTypes[K]): void };
};
export interface GameMod {
  readonly id: string;
  register(registries: Registration): void;
}
