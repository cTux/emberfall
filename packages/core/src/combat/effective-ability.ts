import type { Game } from './ability-game.ts';
import type { Player } from '@emberfall/core/contracts';
import type { AbilityDefinition } from '../content/contracts.ts';
import { game } from '../game.ts';
import { PERCENT } from '@emberfall/core/contracts';
import { COMBAT_TUNING } from './tuning.ts';

export function effectiveAbility(
  player: Player,
  ability: Readonly<AbilityDefinition>,
  context: Game = game,
) {
  const { bonuses } = context.rules.characterStats(player);

  return {
    ...ability,
    range: ability.range * (1 + bonuses.range / PERCENT),
    manualRange: ability.manualRange * (1 + bonuses.range / PERCENT),
    count: ability.count + (ability.kind === 'fireball' ? bonuses.moreProjectiles : 0),
    bounces: ability.bounces + (ability.kind === 'roots' ? bonuses.projectilesBounce : 0),
    pierce:
      (ability.pierce ?? COMBAT_TUNING.defaultArrowPierce) +
      (ability.kind === 'arrow' ? bonuses.projectilePierce : 0),
    splashRadius: ability.splashRadius * (1 + bonuses.areaOfEffect / PERCENT),
    bounceRadius: ability.bounceRadius * (1 + bonuses.range / PERCENT),
  };
}
