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

export const talentCast = {
  mechanics: defaults,
  classMechanics: {
    druid: [
      ...defaults.slice(0, 4),
      'companion',
      'companion',
      'companion',
      'companion',
      ...defaults.slice(8),
    ],
  } as Readonly<Record<string, readonly TalentMechanic[]>>,
  range: 700,
  classRange: { warrior: 350 } as Readonly<Record<string, number>>,
  areaRadius: [125, 170],
  primaryRadius: 180,
} as const;
