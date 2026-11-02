import type { CharacterStats } from '../content/rules.ts';
import type { SceneState } from '@emberfall/common';

export interface FighterState {
  stats?: CharacterStats;
  scene: SceneState;
  classId: string;
  hits: number;
  guardUntil: number;
  guardReadyAt: number;
  barrier: number;
  barrierUntil: number;
  wallUntil: number;
  wallRank: number;
  reprisalAt: number;
  sequence: { slot: number; at: number }[];
  rhythmAt: number;
  fissure?: { x: number; y: number; until: number };
  empoweredUntil?: number;
  wallPrevented?: boolean;
  rebirthAt?: number;
  challengeHits?: Set<number>;
}
