import type { Player, SceneState } from '@emberfall/common';
import { game, type createGame } from './game.ts';
import { TALENT_TREE, isTalentLearned, talentRank } from './talent-tree.ts';
import { recoveryCooldownMs } from './utils/recoveryCooldownMs.ts';
import { FOREST } from './scene.ts';
import { inTrainingZone } from './world.ts';
import { executeTalent } from './talent-effects.ts';
import { healingTarget } from './tactics.ts';
import { DEFAULT_TACTICS } from '@emberfall/common';
import { nearestSpellTarget, setRewardPlayers, effectiveAbility } from './class-combat.ts';
type Game = ReturnType<typeof createGame>;
export function talentAbility(player: Pick<Player, 'classId'>, slot: number, context: Game = game) {
  return context.registries.abilities
    .values()
    .find(
      (ability) => ability.classId === (player.classId ?? 'warrior') && ability.talentSlot === slot,
    );
}
export function equippedTalent(player: Player, slot: number) {
  return TALENT_TREE.find(
    (node) =>
      node.id === player.talentSlots?.[slot] &&
      node.classId === (player.classId ?? 'warrior') &&
      node.kind === 'ability',
  );
}
export function talentCooldownMs(player: Player, slot: number, context: Game = game) {
  return recoveryCooldownMs(
    talentAbility(player, slot, context)?.intervalMs ?? 0,
    context.rules.characterStats(player).cooldownRecoveryRate,
  );
}
export function castTalentAbility(
  scene: SceneState | undefined,
  player: Player,
  request: {
    slot: number;
    classId: string;
    epoch: string;
    aimX: number;
    aimY: number;
    automatic?: boolean;
  },
  now: number,
  context: Game = game,
  players: Player[] = [player],
) {
  const node = equippedTalent(player, request.slot);
  const baseAbility =
    node?.slot === undefined ? undefined : talentAbility(player, node.slot, context);
  const ability = baseAbility && effectiveAbility(player, baseAbility, context);
  if (
    !scene ||
    !node ||
    !ability ||
    !Number.isInteger(request.slot) ||
    request.slot < 0 ||
    request.slot > 3 ||
    !Number.isFinite(request.aimX) ||
    !Number.isFinite(request.aimY) ||
    request.aimX < 0 ||
    request.aimX > FOREST.width ||
    request.aimY < 0 ||
    request.aimY > FOREST.height ||
    !isTalentLearned(player, node.id) ||
    player.hitpoints <= 0 ||
    !context.rules.characterStats(player).hasWeapon ||
    !Number.isFinite(talentCooldownMs(player, node.slot!, context)) ||
    scene.phase !== 'active' ||
    scene.pausedAt !== undefined ||
    request.classId !== (player.classId ?? 'warrior') ||
    request.epoch !== (player.scene === 'forest' ? scene.id : 'lobby') ||
    (!player.scene && !inTrainingZone(player)) ||
    now < (player.talentCooldowns?.[ability.id] ?? -Infinity)
  )
    return false;
  if (
    player.classId === 'druid' &&
    node.column === 1 &&
    (!player.bear || player.bear.hitpoints <= 0)
  )
    return false;
  if (
    request.automatic &&
    player.classId === 'druid' &&
    node.column === 2 &&
    [8, 9, 11].includes(node.slot!)
  ) {
    const radius =
      node.slot === 9
        ? 200 * (1 + context.rules.characterStats(player).bonuses.areaOfEffect / 100)
        : ability.range;
    if (
      !healingTarget(players, player, player, radius, (player.tactics ?? DEFAULT_TACTICS).healBelow)
    )
      return false;
  }
  player.talentCooldowns = {
    ...player.talentCooldowns,
    [ability.id]: now + talentCooldownMs(player, node.slot!, context),
  };
  setRewardPlayers(scene, players);
  const target =
    player.autoTarget !== false
      ? nearestSpellTarget(player, scene.enemies, ability.range)
      : undefined;
  executeTalent(
    scene,
    player,
    node.slot!,
    node.id,
    talentRank(player, node.id),
    { x: target?.x ?? request.aimX, y: target?.y ?? request.aimY },
    now,
    context.rules.characterStats(player),
    players,
    ability.range,
  );
  return true;
}
