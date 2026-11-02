import type { Game } from './talent-combat-game.ts';
import { talentAbility } from './talent-ability.ts';
import type { Player } from '@emberfall/common';
import { game } from './game.ts';
import { recoveryCooldownMs } from './utils/recoveryCooldownMs.ts';

export function talentCooldownMs(player: Player, slot: number, context: Game = game) {
  return recoveryCooldownMs(
    talentAbility(player, slot, context)?.intervalMs ?? 0,
    context.rules.characterStats(player).cooldownRecoveryRate,
  );
}
