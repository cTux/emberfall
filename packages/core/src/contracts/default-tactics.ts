import type { Tactics } from './tactics-contract.ts';
import { HEAL_THRESHOLDS } from './heal-thresholds.ts';

export const DEFAULT_TACTICS: Tactics = {
  offensive: ['nearest', 'lowestHealth', 'elite'],
  defensive: ['lowestHealth', 'players', 'self'],
  keepTarget: false,
  healBelow: HEAL_THRESHOLDS.injured,
  includeCompanions: true,
  stance: 'balanced',
  distance: 'medium',
  companionTarget: 'priorities',
  avoidHazards: true,
};
