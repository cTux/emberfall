import { dimensionDefinition } from '../dimensions.ts';
import { tickEnemyProjectiles } from './enemy-projectiles.ts';
import { game, type createGame } from '../game.ts';
import { talentIncomingDamage } from '../talent-effects.ts';
import { modelHitbox, overlapsBody } from '../hitboxes.ts';
import { BEAR_DEFINITION } from '../definitions/entities/companions.ts';
import { ENEMY_RULES } from '../definitions/entities/enemies.ts';
import { appendSceneEntities, wrappedDelta } from '@emberfall/common';
import { FOREST, forestDistance } from '../scene.ts';
import { moveEnemies } from '../enemies.ts';
import type { Player, Bear, SceneState } from '@emberfall/common';
import { EnemyKind, EnemyType } from '@emberfall/common/enums';
import { enemyAttributes } from '../utils/enemyAttributes.ts';
import { recordCombatTotal } from '../combat/meters.ts';
import type { EnemyDefinition } from '../content/contracts.ts';

// A missed windup retries after 150 ms rather than imposing the full successful-attack cooldown.
const MISSED_ATTACK_RETRY_MS = 150;
// Existing ranged warning size marks a narrower target than a melee attack reach.
const RANGED_WARNING_RADIUS = 22;
type Game = ReturnType<typeof createGame>;
export function tickEnemyCombat(
  scene: SceneState,
  alive: Player[],
  now: number,
  dt: number,
  ENEMY_STATS: Readonly<Record<string, Readonly<EnemyDefinition>>>,
  context: Game = game,
) {
  scene.projectiles ??= [];
  const scale = dimensionDefinition(scene.dimension, context).enemyMultiplier;
  const combatants = [
    ...alive,
    ...alive.flatMap((p) => {
      return p.bear && p.bear.hitpoints > 0 ? [p.bear] : [];
    }),
  ];
  moveEnemies(scene.enemies, combatants, dt, now, context, scene.difficulty, scene.dimension);
  const hurt = (target: Player | Bear, damage: number) => {
    if (target.hitpoints <= 0 || now - (target.hurtAt ?? 0) < ENEMY_RULES.damageCooldownMs) {
      return;
    }

    const owner =
      'returning' in target
        ? alive.find((p) => {
            return p.bear === target;
          })
        : target;
    const reduction = owner ? context.rules.characterStats(owner).damageReduction : 0;
    damage *= 1 - reduction;

    if (!('returning' in target)) {
      damage = talentIncomingDamage(scene, target, damage, now, context);
    } else if (damage > 0) {
      damage = Math.max(1, damage);
    }

    damage = Math.min(target.hitpoints, damage);
    target.hitpoints = Math.max(0, target.hitpoints - damage);
    target.hurtAt = now;

    if ('returning' in target && target.hitpoints === 0) {
      target.resurrectAt = now + BEAR_DEFINITION.resurrectionMs;
    }

    if (damage <= 0) {
      return;
    }

    if (!('returning' in target)) {
      recordCombatTotal(target, 'receivedMeter', damage, now);
    }

    appendSceneEntities(scene, 'damage', {
      id: ++scene.sequence,
      x: target.x,
      y: target.y,
      amount: damage,
      damageType: 'physical',
      critical: false,
      at: now,
      target: target.id,
    });
  };

  for (const enemy of scene.enemies) {
    if ((enemy.controlledUntil ?? 0) > now) {
      continue;
    }

    const stats = ENEMY_STATS[enemy.archetype ?? 'skeleton'];
    const damage =
      enemyAttributes(
        enemy.archetype ?? EnemyKind.Skeleton,
        enemy.kind ?? EnemyType.Normal,
        scene.difficulty,
        context,
      ).damage * scale;
    const challenged =
      (enemy.challengedUntil ?? 0) > now
        ? combatants.find((player) => {
            return player.id === enemy.challengedBy && player.hitpoints > 0;
          })
        : undefined;
    const target =
      challenged ??
      combatants
        .filter((p) => {
          return p.hitpoints > 0;
        })
        .reduce<Player | Bear | undefined>((best, p) => {
          return !best || forestDistance(p, enemy) < forestDistance(best, enemy) ? p : best;
        }, undefined);

    if (enemy.attack) {
      const attack = enemy.attack;

      if (now < attack.endsAt) {
        continue;
      }

      enemy.attack = undefined;
      const inRange = target && forestDistance(enemy, target) <= stats.reach * scale;
      enemy.cooldownUntil =
        now + (inRange || stats.skill ? stats.cooldown / scale : MISSED_ATTACK_RETRY_MS);

      if (!inRange && !stats.skill) {
        continue;
      }

      if (attack.ranged) {
        const angle = Math.atan2(
          wrappedDelta(attack.y, enemy.y, FOREST.height),
          wrappedDelta(attack.x, enemy.x, FOREST.width),
        );

        const count = stats.skill?.kind === 'volley' ? stats.skill.count : 1;
        const spread = stats.skill?.kind === 'volley' ? stats.skill.spread : 0;

        for (
          let index = 0;
          index < count && scene.projectiles.length < ENEMY_RULES.maxAlive;
          index++
        ) {
          const heading = angle + (index - (count - 1) / 2) * spread;
          appendSceneEntities(scene, 'projectiles', {
            id: ++scene.sequence,
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(heading) * ENEMY_RULES.projectileSpeed * scale,
            vy: Math.sin(heading) * ENEMY_RULES.projectileSpeed * scale,
            expiresAt: now + ENEMY_RULES.projectileLifetimeMs,
            damage,
          });
        }
      } else {
        for (const player of combatants) {
          if (overlapsBody(attack, attack.radius, modelHitbox(player))) {
            hurt(player, damage);
          }
        }
      }
    } else if (
      target &&
      now >= (enemy.cooldownUntil ?? 0) &&
      forestDistance(enemy, target) <= stats.reach * scale
    ) {
      const ground = stats.skill?.kind === 'ground' ? stats.skill : undefined;
      const ranged = stats.behavior === 'ranged' && !ground;
      const targeted = ranged || ground?.targeted;
      enemy.attack = {
        startedAt: now,
        endsAt: now + stats.windup / scale,
        x: targeted ? target.x : enemy.x,
        y: targeted ? target.y : enemy.y,
        radius: (ground?.radius ?? (ranged ? RANGED_WARNING_RADIUS : stats.reach)) * scale,
        ranged,
      };
    }
  }

  tickEnemyProjectiles(scene, combatants, now, dt, hurt);
}
