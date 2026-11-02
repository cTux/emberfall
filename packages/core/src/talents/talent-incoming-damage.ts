import type { Game } from './game.ts';
import type { SceneState, Player } from '@emberfall/core/contracts';
import { game } from '../game.ts';
import { state } from './state.ts';
import { PASSIVES } from './passive-tuning.ts';
import { rank, talentArea as area } from '../talent-ailments.ts';
import { TALENT_MAX_RANK, TALENT_DEFENSIVE_COLUMN } from '../talent-catalog.ts';
import { strike, talentVisual } from './effects.ts';
import { TALENT_NAMES } from '../talent-tree.ts';

export function talentIncomingDamage(
  scene: SceneState,
  player: Player,
  amount: number,
  now: number,
  context: Game = game,
) {
  const value = state(player, scene);
  let prevented = 0;

  if (value.guardUntil > now) {
    const reduction = PASSIVES.guardReduction[rank(player, 2, 0) === TALENT_MAX_RANK ? 1 : 0];
    prevented += amount * reduction;
    amount *= 1 - reduction;
    value.guardUntil = 0;
  }

  if (value.wallUntil > now) {
    value.wallPrevented = true;
    const reduction = PASSIVES.wallReduction[value.wallRank === TALENT_MAX_RANK ? 1 : 0];
    prevented += amount * reduction;
    amount *= 1 - reduction;
  }

  if (value.barrierUntil > now && value.barrier > 0) {
    const absorbed = Math.min(value.barrier, amount);
    value.barrier -= absorbed;
    amount -= absorbed;
    prevented += absorbed;
  }

  const retaliation = rank(player, 2, 6);

  if (prevented > 0 && retaliation && now >= value.reprisalAt) {
    value.reprisalAt = now + PASSIVES.reprisalCooldownMs;

    for (const enemy of area(scene, player, PASSIVES.reprisalRadius, player)) {
      strike(
        scene,
        player,
        enemy,
        PASSIVES.reprisalPower[retaliation === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][2][6],
        context,
      );
    }

    talentVisual(scene, player, TALENT_DEFENSIVE_COLUMN, player, now);
  }

  const rebirth = rank(player, 2, 9);

  if (amount > 0) {
    amount = Math.max(1, amount);
  }

  if (
    player.classId === 'druid' &&
    rebirth &&
    amount >= player.hitpoints &&
    now >= (value.rebirthAt ?? 0)
  ) {
    value.rebirthAt = now + PASSIVES.rebirthCooldownMs;
    amount = Math.max(
      0,
      player.hitpoints -
        player.maxHitpoints * PASSIVES.rebirthHealthFraction[rebirth === TALENT_MAX_RANK ? 1 : 0],
    );
    talentVisual(scene, player, TALENT_DEFENSIVE_COLUMN, player, now);
  }

  return amount;
}
