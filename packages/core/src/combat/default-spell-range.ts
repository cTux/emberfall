import type { Game } from './ability-game.ts';
import type { Player } from '@emberfall/common';
import { game } from '../game.ts';
import { PERCENT } from '@emberfall/common';

export function defaultSpellRange(
  player: Pick<Player, 'classId' | 'autoTarget' | 'equipment' | 'equipmentItems'>,
  context: Game = game,
) {
  const stats = context.rules.characterStats(player);

  if (!stats.hasWeapon) {
    return 0;
  }

  const range = player.autoTarget === false ? stats.manualRange : stats.range;
  const attack = context.registries.abilities.require(
    context.registries.classes.require(player.classId ?? 'warrior').attack,
  );

  return range * (attack.kind === 'slash' ? 1 + stats.bonuses.areaOfEffect / PERCENT : 1);
}
