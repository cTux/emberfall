import type { AbilityDefinition } from '../../../content/contracts.ts';
import { TALENT_NAMES } from '../../../talent-catalog.ts';
export const TALENT_ABILITIES: readonly AbilityDefinition[] = Object.entries(TALENT_NAMES).flatMap(
  ([classId, columns]) => {
    return columns.flatMap((names, column) => {
      return [1, 3, 5, 7].map((row, tier) => {
        return {
          id: `talent:${classId}:${column * 4 + tier}`,
          name: names[row],
          classId,
          talentSlot: column * 4 + tier,
          kind:
            classId === 'warrior'
              ? 'slash'
              : classId === 'ranger'
                ? 'arrow'
                : classId === 'mage'
                  ? 'fireball'
                  : 'roots',
          range: classId === 'warrior' ? [125, 110, 185, 85][tier] : 700,
          manualRange: classId === 'warrior' ? [125, 110, 185, 85][tier] : 1000,
          damage: [1.5, 1.35, 1.8, 1.8][tier],
          powerScale: [1.5, 1.35, 1.8, 1.8][tier],
          intervalMs: [6000, 10000, 14000, 18000][tier],
          durationMs: 260,
          aimSmoothingSeconds: 0.08,
          speed: classId === 'ranger' ? 700 : 420,
          count: classId === 'warrior' ? 0 : [3, 4, 1, 5][tier],
          spreadRadians: 0.12,
          piercing: classId === 'ranger',
          splashRadius: [100, 120, 160, 140][tier],
          splashDamage: [0.75, 0.6, 1.2, 1][tier],
          bounces: [0, 3, 1, 4][tier],
          bounceRadius: 300,
        };
      });
    });
  },
);
