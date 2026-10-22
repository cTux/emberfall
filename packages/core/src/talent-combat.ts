import type { Player, SceneState } from '@emberfall/common';
import { game, type createGame } from './game.ts';
import { TALENT_TREE, isTalentLearned } from './talent-tree.ts';
import { fireClassAttack, hitWithWeapon } from './class-combat.ts';
import { FOREST, forestDistance } from './scene.ts';
import { inTrainingZone } from './world.ts';
import { swordOverlapsEnemy, playerAimAngle } from './simulation.ts';

type Game = ReturnType<typeof createGame>;
export function talentAbility(player: Pick<Player, 'classId'>, slot: number, context: Game = game) {
  return context.registries.abilities
    .values()
    .find(
      (ability) => ability.classId === (player.classId ?? 'warrior') && ability.talentSlot === slot,
    );
}
export function talentCooldownMs(player: Player, slot: number, context: Game = game) {
  const speed = TALENT_TREE.filter(
    (node) => node.kind === 'speed' && isTalentLearned(player, node.id),
  ).length;
  return (talentAbility(player, slot, context)?.intervalMs ?? 0) / (1 + speed * 0.1);
}
export function castTalentAbility(
  scene: SceneState | undefined,
  player: Player,
  request: { slot: number; classId: string; epoch: string; aimX: number; aimY: number },
  now: number,
  context: Game = game,
) {
  const node = TALENT_TREE.find((entry) => entry.slot === request.slot);
  const ability = talentAbility(player, request.slot, context);
  if (
    !scene ||
    !node ||
    !ability ||
    !Number.isFinite(request.aimX) ||
    !Number.isFinite(request.aimY) ||
    request.aimX < 0 ||
    request.aimX > FOREST.width ||
    request.aimY < 0 ||
    request.aimY > FOREST.height ||
    !isTalentLearned(player, node.id) ||
    player.hitpoints <= 0 ||
    !context.rules.characterStats(player).hasWeapon ||
    scene.phase !== 'active' ||
    scene.pausedAt !== undefined ||
    request.classId !== (player.classId ?? 'warrior') ||
    request.epoch !== (player.scene === 'forest' ? scene.id : 'lobby') ||
    (!player.scene && !inTrainingZone(player)) ||
    now < (player.talentCooldowns?.[ability.id] ?? -Infinity)
  )
    return false;
  player.talentCooldowns = {
    ...player.talentCooldowns,
    [ability.id]: now + talentCooldownMs(player, request.slot, context),
  };
  // Snapshot cursor aim without changing the base attack's targeting preferences.
  const aimed = { ...player, autoTarget: false, aimX: request.aimX, aimY: request.aimY };
  if (ability.kind === 'slash') {
    const actor = { ...aimed, attackAngle: playerAimAngle(aimed, scene.enemies) };
    for (const enemy of scene.enemies) {
      const overlaps =
        request.slot === 1
          ? forestDistance(player, enemy) <= ability.range
          : swordOverlapsEnemy(actor, enemy, ability.range, context);
      if (enemy.hitpoints > 0 && overlaps)
        hitWithWeapon(
          scene,
          enemy,
          player,
          now,
          'bleed',
          ability.powerScale ?? 1,
          context.rules.characterStats(player),
        );
    }
  } else
    fireClassAttack(
      scene,
      { ...aimed, attackAt: now, attackId: undefined },
      now,
      context,
      ability.id,
    );
  return true;
}
