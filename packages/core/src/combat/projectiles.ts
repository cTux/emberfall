import { game, type createGame } from '../game.ts';
type Game = ReturnType<typeof createGame>;
import { appendSceneEntities, wrappedDelta } from '@emberfall/common';
import type { SceneState, Player, Enemy, PlayerShot } from '@emberfall/common';
import { FOREST, forestDistance } from '../scene.ts';
import { enemyHitbox, overlapsBody } from '../hitboxes.ts';
import { AILMENT_DEFINITIONS } from '../definitions/effects/ailments.ts';
import { TRANSIENT_EFFECTS } from '../definitions/effects/transient.ts';
import { COLLISION } from '../definitions/collision.ts';
import { effectiveAbility, nearestSpellTarget, projectileAngle } from './ability.ts';
import { advancePlayerShot } from './projectile-motion.ts';
import { hitWithWeapon } from './weapon.ts';

function applyRoots(target: Enemy, ownerId: string, now: number) {
  if (target.kind === 'boss') {
    return;
  }

  target.debuffs = (target.debuffs ?? []).filter((d) => {
    return d.kind !== 'roots';
  });
  target.debuffs.push({
    kind: 'roots',
    stacks: 1,
    expiresAt: now + AILMENT_DEFINITIONS.roots.durationMs,
    nextTick: now + 1000,
    ownerId,
  });
}

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

export function tickPlayerShots(
  scene: SceneState,
  players: Player[],
  now: number,
  dt: number,
  context: Game = game,
) {
  scene.explosions = (scene.explosions ?? []).filter((e) => {
    return now - e.at < (e.durationMs ?? TRANSIENT_EFFECTS.explosion.lifetimeMs);
  });
  scene.playerShots = (scene.playerShots ?? []).filter((shot) => {
    const owner = players.find((p) => {
      return (
        p.id === shot.ownerId &&
        (scene.training ? !p.scene : p.scene === 'forest') &&
        p.hitpoints > 0
      );
    });
    if (!owner) {
      return false;
    }

    const ability = effectiveAbility(
      owner,
      context.registries.abilities.require(shot.abilityId ?? shot.kind),
      context,
    );
    const stats = context.rules.characterStats(owner);
    const impacted = advancePlayerShot(
      shot,
      scene.enemies,
      dt,
      () => {
        if (shot.kind === 'arrow') {
          for (const enemy of scene.enemies) {
            if (shot.hitIds.length >= 1 + ability.pierce) {
              shot.remaining = 0;
              break;
            }

            if (
              enemy.hitpoints <= 0 ||
              shot.hitIds.includes(enemy.id) ||
              !overlapsBody(shot, COLLISION.playerProjectileRadius, enemyHitbox(enemy, context))
            ) {
              continue;
            }

            shot.hitIds.push(enemy.id);
            hitWithWeapon(
              scene,
              enemy,
              owner,
              now,
              shot.ailment ?? 'poison',
              ability.powerScale ?? 1,
              stats,
              false,
              context,
            );
            if (shot.hitIds.length >= 1 + ability.pierce) {
              shot.remaining = 0;
            }
          }
        }
      },
      true,
      context,
    );
    if (impacted) {
      if (shot.kind === 'roots') {
        const target = scene.enemies.find((enemy) => {
          return enemy.id === shot.hitIds.at(-1);
        });
        if (target) {
          hitWithWeapon(
            scene,
            target,
            owner,
            now,
            undefined,
            ability.powerScale ?? 1,
            stats,
            false,
            context,
          );
          if (target.hitpoints > 0) {
            applyRoots(target, owner.id, now);
          }

          if (shot.hitIds.length <= ability.bounces) {
            const next = scene.enemies
              .filter((enemy) => {
                return (
                  enemy.hitpoints > 0 &&
                  !shot.hitIds.includes(enemy.id) &&
                  forestDistance(target, enemy) <= ability.bounceRadius
                );
              })
              .reduce<Enemy | undefined>((best, enemy) => {
                return !best || forestDistance(target, enemy) < forestDistance(target, best)
                  ? enemy
                  : best;
              }, undefined);
            if (next) {
              shot.targetId = next.id;
              shot.targetX = next.x;
              shot.targetY = next.y;

              return true;
            }
          }
        }

        return false;
      }

      appendSceneEntities(scene, 'explosions', {
        ownerId: shot.ownerId,
        id: ++scene.sequence,
        x: shot.x,
        y: shot.y,
        at: now,
        radius: ability.splashRadius,
      });
      for (const enemy of scene.enemies) {
        if (enemy.id === shot.hitIds[0]) {
          hitWithWeapon(
            scene,
            enemy,
            owner,
            now,
            shot.ailment ?? 'burn',
            ability.powerScale ?? 1,
            stats,
            false,
            context,
          );
        } else if (overlapsBody(shot, ability.splashRadius, enemyHitbox(enemy, context))) {
          hitWithWeapon(
            scene,
            enemy,
            owner,
            now,
            shot.ailment ?? 'burn',
            ability.damage > 0
              ? (ability.splashDamage / ability.damage) * (ability.powerScale ?? 1)
              : 0,
            stats,
            false,
            context,
          );
        }
      }

      return false;
    }

    return shot.remaining > 0.001;
  });
}
