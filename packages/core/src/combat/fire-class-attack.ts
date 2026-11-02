import type { Game } from './game.ts';
import type { SceneState, Player, Enemy, PlayerShot } from '@emberfall/core/contracts';
import { game } from '../game.ts';
import { effectiveAbility, nearestSpellTarget, projectileAngle } from './ability.ts';
import { appendSceneEntities } from '@emberfall/core/contracts';
import { wrappedDelta } from '@emberfall/core/geometry';
import { FOREST } from '../scene.ts';

export function fireClassAttack(
  scene: SceneState,
  player: Player,
  now = 0,
  context: Game = game,
  abilityId?: string,
) {
  const stats = context.rules.characterStats(player);

  if (!stats.hasWeapon) {
    return;
  }

  const selected = abilityId
    ? effectiveAbility(player, context.registries.abilities.require(abilityId), context)
    : undefined;
  const range = selected
    ? player.autoTarget === false
      ? selected.manualRange
      : selected.range
    : player.autoTarget === false
      ? stats.manualRange
      : stats.range;
  const manual = player.autoTarget === false;
  const aim = { x: player.aimX ?? player.x, y: player.aimY ?? player.y };
  const target = manual ? undefined : nearestSpellTarget(player, scene.enemies, range);
  scene.playerShots ??= [];
  const shotTargets: (Enemy | undefined)[] = manual ? [undefined] : target ? [target] : [];

  for (const target of shotTargets) {
    const destination = target ?? aim;
    const aimAngle = Math.atan2(
      wrappedDelta(destination.y, player.y, FOREST.height),
      wrappedDelta(destination.x, player.x, FOREST.width),
    );
    const attack = effectiveAbility(
      player,
      context.registries.abilities.require(
        abilityId ?? context.registries.classes.require(player.classId ?? 'ranger').attack,
      ),
      context,
    );
    const ailment = context.registries.classes.require(player.classId ?? 'ranger').ailment;
    const defaultAilment =
      attack.kind === 'arrow' ? 'poison' : attack.kind === 'fireball' ? 'burn' : 'roots';
    const count = attack.kind === 'slash' ? 0 : attack.count;

    for (let index = 0; index < count; index++) {
      appendSceneEntities(scene, 'playerShots', {
        id: ++scene.sequence,
        ownerId: player.id,
        castAt: player.attackAt ?? now,
        castId: player.attackId,
        kind: attack.kind as PlayerShot['kind'],
        ...(attack.id === attack.kind ? {} : { abilityId: attack.id }),
        ...(ailment === defaultAilment ? {} : { ailment }),
        x: player.x,
        y: player.y,
        angle: projectileAngle(aimAngle, index, count, attack.spreadRadians),
        remaining: range,
        hitIds: [],
        targetId: target?.id,
        targetX: destination.x,
        targetY: destination.y,
      });
    }
  }
}
