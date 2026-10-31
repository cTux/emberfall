import { game, type createGame } from '../game.ts';
type Game = ReturnType<typeof createGame>;
import { attackTarget } from '../tactics.ts';
import type { Player, Enemy } from '@emberfall/common';
import type { AbilityDefinition } from '../content/contracts.ts';
import { ATTACK_DEFINITIONS } from '../definitions/abilities/attacks.ts';

export function effectiveAbility(
  player: Player,
  ability: Readonly<AbilityDefinition>,
  context: Game = game,
) {
  const { bonuses } = context.rules.characterStats(player);

  return {
    ...ability,
    range: ability.range * (1 + bonuses.range / 100),
    manualRange: ability.manualRange * (1 + bonuses.range / 100),
    count: ability.count + (ability.kind === 'fireball' ? bonuses.moreProjectiles : 0),
    bounces: ability.bounces + (ability.kind === 'roots' ? bonuses.projectilesBounce : 0),
    pierce: (ability.pierce ?? 3) + (ability.kind === 'arrow' ? bonuses.projectilePierce : 0),
    splashRadius: ability.splashRadius * (1 + bonuses.areaOfEffect / 100),
    bounceRadius: ability.bounceRadius * (1 + bonuses.range / 100),
  };
}

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

  return range * (attack.kind === 'slash' ? 1 + stats.bonuses.areaOfEffect / 100 : 1);
}

export function projectileAngle(
  aimAngle: number,
  index: number,
  count: number,
  spread = ATTACK_DEFINITIONS.arrow.spreadRadians,
) {
  return aimAngle + (index - (count - 1) / 2) * spread;
}

/** Shared wrapped target selection for cast scheduling, launch and prediction. */
export function nearestSpellTarget(
  player: { x: number; y: number } & Partial<Pick<Player, 'tactics' | 'attackTargetId'>>,
  enemies: Enemy[],
  range: number,
) {
  return attackTarget(player, enemies, range, player.tactics, player.attackTargetId);
}
