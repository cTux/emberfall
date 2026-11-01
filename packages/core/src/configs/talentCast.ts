import { TALENT_ABILITIES_PER_COLUMN, TALENT_DEFENSIVE_COLUMN } from '../talent-catalog.ts';

export type TalentMechanic = 'defensive' | 'companion' | 'woundBurst' | 'offensive';
const defaults = [
  'offensive',
  'offensive',
  'offensive',
  'offensive',
  'offensive',
  'offensive',
  'woundBurst',
  'offensive',
  'defensive',
  'defensive',
  'defensive',
  'defensive',
] as const satisfies readonly TalentMechanic[];

// Existing targeting calibration keeps warrior reach shorter and uses the established rank-based areas.
// Preserve these tuning values until an explicit talent-balance change supplies new targets.
export const talentCast = {
  mechanics: defaults,
  classMechanics: {
    druid: [
      ...defaults.slice(0, TALENT_ABILITIES_PER_COLUMN),
      'companion',
      'companion',
      'companion',
      'companion',
      ...defaults.slice(TALENT_DEFENSIVE_COLUMN * TALENT_ABILITIES_PER_COLUMN),
    ],
  } as Readonly<Record<string, readonly TalentMechanic[]>>,
  range: 700,
  classRange: { warrior: 350 } as Readonly<Record<string, number>>,
  areaRadius: [125, 170],
  primaryRadius: 180,
} as const;
