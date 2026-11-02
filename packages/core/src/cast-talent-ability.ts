import type { Game } from './talent-combat-game.ts';
import { equippedTalent } from './equipped-talent.ts';
import { talentAbility } from './talent-ability.ts';
import { talentCooldownMs } from './talent-cooldown-ms.ts';
import type { SceneState, Player } from '@emberfall/common';
import { game } from './game.ts';
import { effectiveAbility, setRewardPlayers, nearestSpellTarget } from './class-combat.ts';
import {
  TALENT_ACTION_SLOTS,
  TALENT_DEFENSIVE_COLUMN,
  TALENT_HEALING_SLOTS,
  TALENT_SHELTER_SLOT,
} from './talent-catalog.ts';
import { FOREST } from './scene.ts';
import { isTalentLearned, talentRank } from './talent-tree.ts';
import { inTrainingZone } from './world.ts';
import { PERCENT, DEFAULT_TACTICS } from '@emberfall/common';
import { healingTarget } from './tactics.ts';
import { executeTalent } from './talent-effects.ts';

// Match the existing shelter/grove healing reach when deciding whether an automatic cast is useful.
const AUTOMATIC_SHELTER_RADIUS = 200;

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
    request.slot >= TALENT_ACTION_SLOTS ||
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
  ) {
    return false;
  }

  if (
    player.classId === 'druid' &&
    node.column === 1 &&
    (!player.bear || player.bear.hitpoints <= 0)
  ) {
    return false;
  }

  if (
    request.automatic &&
    player.classId === 'druid' &&
    node.column === TALENT_DEFENSIVE_COLUMN &&
    TALENT_HEALING_SLOTS.includes(node.slot!)
  ) {
    const radius =
      node.slot === TALENT_SHELTER_SLOT
        ? AUTOMATIC_SHELTER_RADIUS *
          (1 + context.rules.characterStats(player).bonuses.areaOfEffect / PERCENT)
        : ability.range;

    if (
      !healingTarget(players, player, player, radius, (player.tactics ?? DEFAULT_TACTICS).healBelow)
    ) {
      return false;
    }
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
    request.automatic ? (player.tactics ?? DEFAULT_TACTICS).healBelow : 1,
    context,
  );

  return true;
}
