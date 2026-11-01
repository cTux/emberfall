import type { AbilityDefinition } from '../../../content/contracts.ts';
import {
  TALENT_NAMES,
  TALENT_ABILITY_ROWS,
  TALENT_ABILITIES_PER_COLUMN,
} from '../../../talent-catalog.ts';
import { BASE_ATTACK_TIMING } from './attacks.ts';

// These per-tier tables retain the existing talent balance, not newly benchmarked optimal values.
const TALENT_TUNING = {
  warriorRange: [125, 110, 185, 85],
  rangedAutoRange: 700,
  rangedManualRange: 1000,
  powerScale: [1.5, 1.35, 1.8, 1.8],
  // Higher-tier abilities preserve their existing longer six/ten/fourteen/eighteen-second cooldowns.
  intervalMs: [6000, 10000, 14000, 18000],
  rangerSpeed: 700,
  spellSpeed: 420,
  projectileCount: [3, 4, 1, 5],
  spreadRadians: 0.12,
  splashRadius: [100, 120, 160, 140],
  splashDamage: [0.75, 0.6, 1.2, 1],
  bounces: [0, 3, 1, 4],
  bounceRadius: 300,
} as const;
const attackKinds = new Map<string, AbilityDefinition['kind']>([
  ['warrior', 'slash'],
  ['ranger', 'arrow'],
  ['mage', 'fireball'],
]);
export const TALENT_ABILITIES: readonly AbilityDefinition[] = Object.entries(TALENT_NAMES).flatMap(
  ([classId, columns]) => {
    return columns.flatMap((names, column) => {
      return TALENT_ABILITY_ROWS.map((row, tier) => {
        return {
          id: `talent:${classId}:${column * TALENT_ABILITIES_PER_COLUMN + tier}`,
          name: names[row],
          classId,
          talentSlot: column * TALENT_ABILITIES_PER_COLUMN + tier,
          kind: attackKinds.get(classId) ?? 'roots',
          range:
            classId === 'warrior'
              ? TALENT_TUNING.warriorRange[tier]
              : TALENT_TUNING.rangedAutoRange,
          manualRange:
            classId === 'warrior'
              ? TALENT_TUNING.warriorRange[tier]
              : TALENT_TUNING.rangedManualRange,
          damage: TALENT_TUNING.powerScale[tier],
          powerScale: TALENT_TUNING.powerScale[tier],
          intervalMs: TALENT_TUNING.intervalMs[tier],
          durationMs: BASE_ATTACK_TIMING.durationMs,
          aimSmoothingSeconds: BASE_ATTACK_TIMING.aimSmoothingSeconds,
          speed: classId === 'ranger' ? TALENT_TUNING.rangerSpeed : TALENT_TUNING.spellSpeed,
          count: classId === 'warrior' ? 0 : TALENT_TUNING.projectileCount[tier],
          spreadRadians: TALENT_TUNING.spreadRadians,
          piercing: classId === 'ranger',
          splashRadius: TALENT_TUNING.splashRadius[tier],
          splashDamage: TALENT_TUNING.splashDamage[tier],
          bounces: TALENT_TUNING.bounces[tier],
          bounceRadius: TALENT_TUNING.bounceRadius,
        };
      });
    });
  },
);
