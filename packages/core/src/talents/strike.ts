import { type createGame, game } from '../game.ts';
import type { SceneState, Player, Enemy } from '@emberfall/core/contracts';
import { state } from './state.ts';
import { characterStats } from '../equipment.ts';
import { isChanced } from '../utils/isChanced.ts';
import { PERCENT } from '@emberfall/core/contracts';
import { hitEnemy } from '../combat/damage.ts';

type Game = ReturnType<typeof createGame>;

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
