import type { AbilityKind, AbilityDefinition } from '../../../content/contracts.ts';

// Existing attack cadence and presentation calibration: one attack/second, 260 ms swing, 80 ms aim easing.
export const BASE_ATTACK_TIMING = {
  intervalMs: 1000,
  durationMs: 260,
  aimSmoothingSeconds: 0.08,
} as const;
// Six degrees is the existing separation between the starter weapon's projectiles.
const STARTER_PROJECTILE_SPREAD_RADIANS = Math.PI / 30;
// Preserve starter balance: melee trades short reach for five power; spells use three power with area/bounces.
export const ATTACK_DEFINITIONS = {
  slash: {
    id: 'slash',
    range: 75,
    damage: 5,
    ...BASE_ATTACK_TIMING,
  },
  arrow: {
    id: 'arrow',
    range: 1000,
    manualRange: 1000,
    speed: 600,
    damage: 5,
    count: 2,
    spreadRadians: STARTER_PROJECTILE_SPREAD_RADIANS,
    piercing: true,
    pierce: 3,
  },
  fireball: {
    id: 'fireball',
    range: 250,
    manualRange: 1000,
    speed: 380,
    damage: 3,
    count: 2,
    spreadRadians: STARTER_PROJECTILE_SPREAD_RADIANS,
    splashRadius: 100,
    splashDamage: 1,
    piercing: false,
  },
  roots: {
    id: 'roots',
    range: 250,
    manualRange: 1000,
    speed: 380,
    damage: 3,
    count: 1,
    spreadRadians: STARTER_PROJECTILE_SPREAD_RADIANS,
    bounces: 3,
    bounceRadius: 250,
    piercing: false,
  },
} as const satisfies Record<
  AbilityKind,
  Pick<AbilityDefinition, 'id' | 'range' | 'damage'> & Partial<AbilityDefinition>
>;
