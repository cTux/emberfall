import type { Difficulty, EnemyType } from './enums/index.ts';
export type DebuffKind = 'bleed' | 'poison' | 'burn' | 'roots' | 'silence';
/** Shared overhead presentation for timed ailments and indefinite status effects. */
export interface DebuffIndicator {
  kind: DebuffKind;
  stacks?: number;
  expiresAt?: number;
}
export interface Debuff extends DebuffIndicator {
  stacks: number;
  expiresAt: number;
  nextTick: number;
  ownerId: string;
}
export interface PlayerShot {
  id: number;
  castAt?: number;
  castId?: number;
  ownerId: string;
  kind: 'arrow' | 'fireball' | 'roots';
  /** Optional registered ability ID; legacy shots use their mechanic kind. */
  abilityId?: string;
  /** Launch-time ailment when it differs from the built-in mechanic default. */
  ailment?: DebuffKind;
  x: number;
  y: number;
  angle: number;
  remaining: number;
  hitIds: number[];
  targetId?: number;
  targetX?: number;
  targetY?: number;
}
export interface Enemy {
  controlledUntil?: number;
  challengedBy?: string;
  challengedUntil?: number;
  maxHitpoints?: number;
  debuffs?: Debuff[];
  name?: string;
  archetype?: string;
  attack?: {
    startedAt: number;
    endsAt: number;
    x: number;
    y: number;
    radius: number;
    ranged: boolean;
  };
  cooldownUntil?: number;
  kind?: EnemyType;
  id: number;
  x: number;
  y: number;
  hitpoints: number;
  angle: number;
}
export interface DamageEvent {
  ownerId?: string;
  damageType?: import('./content.ts').DamageType;
  critical?: boolean;
  enemy?: Pick<Enemy, 'archetype' | 'kind' | 'angle'>;
  killed?: boolean;
  id: number;
  x: number;
  y: number;
  amount: number;
  at: number;
  target: string;
}
export interface LootDrop {
  /** Server-selected attraction target; presentation may attach to its reconciled pose. */
  collectorId?: string;
  amount?: number;
  id: number;
  kind: 'experience' | 'gold' | 'item';
  itemId?: string;
  x: number;
  y: number;
  at: number;
}
export interface SceneState {
  playerCount?: number;
  training?: boolean;
  pausedAt?: number;
  playerShots?: PlayerShot[];
  explosions?: {
    ownerId?: string;
    id: number;
    x: number;
    y: number;
    at: number;
    talentClass?: string;
    talentColumn?: number;
    durationMs?: number;
  }[];
  drops?: LootDrop[];
  spawns?: (Enemy & { spawnsAt: number; warnedAt: number })[];
  projectiles?: {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    expiresAt: number;
    damage?: number;
  }[];
  bossId?: number;
  spawnCount?: number;
  portals: { x: number; y: number }[];
  sequence: number;
  nextSpawn: number;
  id: string;
  type: 'Forest';
  difficulty: Difficulty;
  phase: 'voting' | 'countdown' | 'active' | 'ended';
  ready: string[];
  countdownAt: number | null;
  endsAt: number | null;
  enemies: Enemy[];
  damage: DamageEvent[];
}
export function hasLivingScenePlayers(players: Iterable<{ scene?: string; hitpoints: number }>) {
  return [...players].some((p) => p.scene === 'forest' && p.hitpoints > 0);
}
