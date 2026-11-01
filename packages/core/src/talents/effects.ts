import { PERCENT, appendSceneEntities } from '@emberfall/common';
import { game, type createGame } from '../game.ts';
import type { Enemy, Player, SceneState } from '@emberfall/common';
import { characterStats } from '../equipment.ts';
import { hitEnemy } from '../combat/damage.ts';
import { applyHealing } from '../combat/meters.ts';
import { isChanced } from '../utils/isChanced.ts';
import { state } from './state.ts';

type Game = ReturnType<typeof createGame>;
// Retain the one-second talent flash so visual effects outlast a single simulation tick.
const TALENT_VISUAL_MS = 1000;
export function talentVisual(
  scene: SceneState,
  player: Player,
  column: number,
  point: { x: number; y: number },
  now: number,
) {
  appendSceneEntities(scene, 'explosions', {
    ownerId: player.id,
    id: ++scene.sequence,
    x: point.x,
    y: point.y,
    at: now,
    talentClass: player.classId ?? 'warrior',
    talentColumn: column,
    durationMs: TALENT_VISUAL_MS,
  });
}

export function control(enemy: Enemy, now: number, duration: number) {
  if (enemy.kind === 'boss') {
    return;
  }

  enemy.controlledUntil = Math.max(enemy.controlledUntil ?? 0, now + duration);
  enemy.attack = undefined;
}

export function strike(
  scene: SceneState,
  player: Player,
  enemy: Enemy,
  scale: number,
  now: number,
  source: string,
  context: Game = game,
) {
  const stats = state(player, scene).stats ?? characterStats(player);
  const critical = isChanced(stats.criticalChance * PERCENT, context.random);
  hitEnemy(
    scene,
    enemy,
    stats.power * scale * (critical ? stats.criticalMultiplier : 1),
    player,
    now,
    undefined,
    stats.damageType,
    critical,
    source,
    stats,
    context,
  );
}

type HealingTarget = Pick<Player, 'x' | 'y' | 'hitpoints' | 'maxHitpoints'>;
export function heal(player: HealingTarget, fraction: number, owner: Player, now: number) {
  applyHealing(player, player.maxHitpoints * fraction, owner, now);
}

export function shield(player: Player, scene: SceneState, amount: number, until: number) {
  const value = state(player, scene);
  value.barrier = Math.max(value.barrier, amount);
  value.barrierUntil = Math.max(value.barrierUntil, until);
}
