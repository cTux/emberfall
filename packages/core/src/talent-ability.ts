import type { Game } from './talent-combat-game.ts';
import type { Player } from '@emberfall/common';
import { game } from './game.ts';

export function talentAbility(player: Pick<Player, 'classId'>, slot: number, context: Game = game) {
  return context.registries.abilities.values().find((ability) => {
    return ability.classId === (player.classId ?? 'warrior') && ability.talentSlot === slot;
  });
}
