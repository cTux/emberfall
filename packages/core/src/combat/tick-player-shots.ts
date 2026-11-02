import type { Game } from './game.ts';
import type { Enemy, SceneState, Player } from '@emberfall/common';
import { AILMENT_DEFINITIONS } from '../definitions/effects/ailments.ts';
import { COMBAT_TUNING } from './tuning.ts';
import { game } from '../game.ts';
import { TRANSIENT_EFFECTS } from '../definitions/effects/transient.ts';
import { effectiveAbility } from './ability.ts';
import { advancePlayerShot } from './projectile-motion.ts';
import { overlapsBody, enemyHitbox } from '../hitboxes.ts';
import { COLLISION } from '../definitions/collision.ts';
import { hitWithWeapon } from './weapon.ts';
import { forestDistance } from '../scene.ts';
import { appendSceneEntities } from '@emberfall/common';

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
    nextTick: now + COMBAT_TUNING.rootsTickMs,
    ownerId,
  });
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

    return shot.remaining > COMBAT_TUNING.projectileRemainingEpsilon;
  });
}
