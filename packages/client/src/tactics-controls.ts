import type { Tactics } from '@emberfall/common';

export type TacticsPriority = Tactics['offensive'][number] | Tactics['defensive'][number];
export const TACTICS_LABELS: Readonly<Record<TacticsPriority, string>> = {
  nearest: 'Nearest enemy',
  lowestHealth: 'Lowest health %',
  elite: 'Elite / boss first',
  players: 'Players before companions',
  self: 'Self before allies',
};

type SelectKey = 'stance' | 'distance' | 'companionTarget';
type SelectControl = {
  [K in SelectKey]: { key: K; label: string; choices: readonly (readonly [Tactics[K], string])[] };
}[SelectKey];

export const POSITIONING_CONTROLS = [
  {
    key: 'stance',
    label: 'Combat stance',
    choices: [
      ['balanced', 'Balanced'],
      ['aggressive', 'Aggressive'],
      ['protect', 'Protect owner'],
      ['passive', 'Passive'],
    ],
  },
  {
    key: 'distance',
    label: 'Stay near owner',
    choices: [
      ['close', 'Close · 100 units'],
      ['medium', 'Medium · 200 units'],
      ['far', 'Far · 300 units'],
    ],
  },
  {
    key: 'companionTarget',
    label: 'Attack target',
    choices: [
      ['priorities', 'Follow offensive priorities'],
      ['assist', 'Assist my current target'],
      ['nearOwner', 'Enemies near me'],
    ],
  },
] as const satisfies readonly SelectControl[];
