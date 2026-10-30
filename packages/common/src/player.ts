import type { CharacterProgress } from './progress.ts';
import type { ClassId } from './content.ts';

export interface Player extends CharacterProgress {
  partyId?: string;
  partyLeaderId?: string;
  homeRunId?: string;
  runId?: string;
  gathering?: TimedActivity & { nodeId: string; epoch: string };
  // coins and storages project the account Storehouse, not the selected class.
  reconnecting?: boolean;
  chat?: string;
  dps?: number;
  damageMeter?: {
    classId: ClassId;
    total: number;
    abilities: Record<string, { damage: number; dps: number }>;
  };
  bear?: Bear;
  classId?: ClassId;
  classes?: Record<ClassId, CharacterProgress>;
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  scene?: 'forest';
  attackAt?: number;
  /** Last processed manual request and the request that started the current attack. */
  castSeq?: number;
  talentCooldowns?: Record<string, number>;
  attackId?: number;
  attackAngle?: number;
  attackTargetId?: number;
  autoAttack?: boolean;
  autoLoot?: boolean;
  autoTarget?: boolean;
  attacking?: boolean;
  aimX?: number;
  aimY?: number;
  combatInputAt?: number;
  hurtAt?: number;
  inputSeq?: number;
  inputElapsed?: number;
  inputX?: number;
  inputY?: number;
  inputAt?: number;
}
export interface Bear {
  size?: number;
  range?: number;
  id: string;
  name: string;
  x: number;
  y: number;
  hitpoints: number;
  maxHitpoints: number;
  attackAt?: number;
  attackAngle?: number;
  hurtAt?: number;
  resurrectAt?: number;
  returning: boolean;
  moving?: boolean;
}
export interface TimedActivity {
  startedAt: number;
  endsAt: number;
  durationMs: number;
  zoneStart: number;
  zoneAt: number;
  checkId: string;
}
