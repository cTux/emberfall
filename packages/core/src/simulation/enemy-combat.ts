import { game, type createGame } from '../game.ts';
import { talentIncomingDamage } from '../talent-effects.ts';
import { modelHitbox, overlapsBody } from '../hitboxes.ts';
import { BEAR_DEFINITION } from '../definitions/entities/companions.ts';
import { ENEMY_RULES } from '../definitions/entities/enemies.ts';
import { COLLISION } from '../definitions/collision.ts';
import { appendSceneEntities, wrappedDelta, wrap } from '@emberfall/common';
import { FOREST, forestDistance, forestTrees } from '../scene.ts';
import { moveEnemies } from '../enemies.ts';
import type { Player, Bear, SceneState } from '@emberfall/common';
import { EnemyKind, EnemyType } from '@emberfall/common/enums';
import { enemyAttributes } from '../utils/enemyAttributes.ts';
import type { EnemyDefinition } from '../content/contracts.ts';

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
  const combatants = [
    ...alive,
    ...alive.flatMap((p) => (p.bear && p.bear.hitpoints > 0 ? [p.bear] : [])),
  ];
  moveEnemies(scene.enemies, combatants, dt, now, context, scene.difficulty);
  const hurt = (target: Player | Bear, damage: number) => {
    if (target.hitpoints <= 0 || now - (target.hurtAt ?? 0) < ENEMY_RULES.damageCooldownMs) return;
    const owner = 'returning' in target ? alive.find((p) => p.bear === target) : target;
    const reduction = owner ? context.rules.characterStats(owner).damageReduction : 0;
    damage *= 1 - reduction;
    if (!('returning' in target))
      damage = talentIncomingDamage(scene, target, damage, now, context);
    else if (damage > 0) damage = Math.max(1, damage);
    damage = Math.min(target.hitpoints, damage);
    target.hitpoints = Math.max(0, target.hitpoints - damage);
    target.hurtAt = now;
    if ('returning' in target && target.hitpoints === 0)
      target.resurrectAt = now + BEAR_DEFINITION.resurrectionMs;
    if (damage <= 0) return;
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
    if ((enemy.controlledUntil ?? 0) > now) continue;
    const stats = ENEMY_STATS[enemy.archetype ?? 'skeleton'];
    const damage = enemyAttributes(
      enemy.archetype ?? EnemyKind.Skeleton,
      enemy.kind ?? EnemyType.Normal,
      scene.difficulty,
      context,
    ).damage;
    const challenged =
      (enemy.challengedUntil ?? 0) > now
        ? combatants.find((player) => player.id === enemy.challengedBy && player.hitpoints > 0)
        : undefined;
    const target =
      challenged ??
      combatants
        .filter((p) => p.hitpoints > 0)
        .reduce<Player | Bear | undefined>(
          (best, p) => (!best || forestDistance(p, enemy) < forestDistance(best, enemy) ? p : best),
          undefined,
        );
    if (enemy.attack) {
      const attack = enemy.attack;
      if (now < attack.endsAt) continue;
      enemy.attack = undefined;
      const inRange = target && forestDistance(enemy, target) <= stats.reach;
      enemy.cooldownUntil = now + (inRange ? stats.cooldown : 150);
      if (!inRange) continue;
      if (attack.ranged) {
        const angle = Math.atan2(
          wrappedDelta(attack.y, enemy.y, FOREST.height),
          wrappedDelta(attack.x, enemy.x, FOREST.width),
        );
        if (scene.projectiles.length < ENEMY_RULES.maxAlive)
          appendSceneEntities(scene, 'projectiles', {
            id: ++scene.sequence,
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * ENEMY_RULES.projectileSpeed,
            vy: Math.sin(angle) * ENEMY_RULES.projectileSpeed,
            expiresAt: now + ENEMY_RULES.projectileLifetimeMs,
            damage,
          });
      } else {
        for (const player of combatants)
          if (overlapsBody(attack, attack.radius, modelHitbox(player))) hurt(player, damage);
      }
    } else if (
      target &&
      now >= (enemy.cooldownUntil ?? 0) &&
      forestDistance(enemy, target) <= stats.reach
    ) {
      const ranged = stats.behavior === 'ranged';
      enemy.attack = {
        startedAt: now,
        endsAt: now + stats.windup,
        x: ranged ? target.x : enemy.x,
        y: ranged ? target.y : enemy.y,
        radius: ranged ? 22 : stats.reach,
        ranged,
      };
    }
  }

  scene.projectiles = scene.projectiles.filter((shot) => {
    if (now >= shot.expiresAt) return false;
    const steps = Math.max(1, Math.ceil((Math.hypot(shot.vx, shot.vy) * dt) / 6));
    for (let i = 0; i < steps; i++) {
      shot.x = wrap(shot.x + (shot.vx * dt) / steps, FOREST.width);
      shot.y = wrap(shot.y + (shot.vy * dt) / steps, FOREST.height);
      if (
        forestTrees(shot.x, shot.y + 15, 24).some(
          (t) => Math.hypot(shot.x - t.x, shot.y + 15 - t.y) < 20,
        )
      )
        return false;
      const hit = combatants.find(
        (p) =>
          p.hitpoints > 0 && overlapsBody(shot, COLLISION.enemyProjectileRadius, modelHitbox(p)),
      );
      if (hit) {
        hurt(
          hit,
          shot.damage ??
            enemyAttributes(EnemyKind.Caster, EnemyType.Normal, scene.difficulty).damage,
        );

        return false;
      }
    }

    return true;
  });
}
