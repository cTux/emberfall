import type { Game } from './game.ts';
import type { Player, Enemy } from '@emberfall/common';
import { game } from '../game.ts';
import { nearestSpellTarget } from '../class-combat.ts';
import { wrappedDelta } from '@emberfall/common';
import { FOREST } from '../scene.ts';
import { nearestEnemyAngle } from './aim.ts';

export function playerAimAngle(player: Player, enemies: Enemy[], context: Game = game) {
  const target = nearestSpellTarget(player, enemies, context.rules.characterStats(player).range);

  return player.autoTarget === false && player.aimX !== undefined && player.aimY !== undefined
    ? Math.atan2(
        wrappedDelta(player.aimY, player.y, FOREST.height),
        wrappedDelta(player.aimX, player.x, FOREST.width),
      )
    : target
      ? nearestEnemyAngle(player, [target], player.attackAngle)
      : (player.attackAngle ?? 0);
}
