import type { TacticsPriority } from './tactics-priority.ts';

export const TACTICS_LABELS: Readonly<Record<TacticsPriority, string>> = {
  nearest: 'Nearest enemy',
  lowestHealth: 'Lowest health %',
  elite: 'Elite / boss first',
  players: 'Players before companions',
  self: 'Self before allies',
};
