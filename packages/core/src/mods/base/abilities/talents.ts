import type { AbilityDefinition } from '../../../content/contracts.ts';
const names: Record<string, string[]> = {
  warrior: ['Sweeping strike', 'Whirlwind', 'Earthshatter', 'Execution'],
  ranger: ['Triple shot', 'Arrow fan', 'Power shot', 'Venom volley'],
  mage: ['Flame burst', 'Ember barrage', 'Meteor', 'Starfire'],
  druid: ['Thorn spear', 'Vine chain', 'Wild roots', 'Spirit seed'],
};
export const TALENT_ABILITIES: readonly AbilityDefinition[] = Object.entries(names).flatMap(
  ([classId, titles]) =>
    titles.map((name, slot) => ({
      id: `talent:${classId}:${slot}`,
      name,
      classId,
      talentSlot: slot,
      kind:
        classId === 'warrior'
          ? 'slash'
          : classId === 'ranger'
            ? 'arrow'
            : classId === 'mage'
              ? 'fireball'
              : 'roots',
      range: classId === 'warrior' ? [125, 110, 185, 85][slot] : 700,
      manualRange: classId === 'warrior' ? [125, 110, 185, 85][slot] : 1000,
      damage: [2, 1, 3, 1.5][slot],
      powerScale: [2, 1, 3, 1.5][slot],
      intervalMs: [5000, 8000, 10000, 12000][slot],
      durationMs: 260,
      aimSmoothingSeconds: 0.08,
      speed: classId === 'ranger' ? 700 : 420,
      count: classId === 'warrior' ? 0 : [3, 7, 1, 4][slot],
      spreadRadians: [0.12, 0.2, 0, 0.25][slot],
      piercing: classId === 'ranger',
      splashRadius: [100, 70, 160, 120][slot],
      splashDamage: [1, 0.5, 2, 1][slot],
      bounces: [0, 5, 3, 1][slot],
      bounceRadius: 300,
    })),
);
