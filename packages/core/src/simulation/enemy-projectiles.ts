import { wrap } from '@emberfall/common';
import type { SceneState, Player, Bear } from '@emberfall/common';
import { COLLISION } from '../definitions/collision.ts';
import { FOREST, forestTrees } from '../scene.ts';
import { overlapsBody, modelHitbox } from '../hitboxes.ts';
import { EnemyKind, EnemyType } from '@emberfall/common/enums';
import { enemyAttributes } from '../utils/enemyAttributes.ts';
// Six-pixel substeps preserve projectile collision at high dimension speeds.
const PROJECTILE_STEP_PIXELS = 6;
const PROJECTILE_TREE_COLLISION = { queryRadius: 24, contactRadius: 20 } as const;
export function tickEnemyProjectiles(
  scene: SceneState,
  combatants: (Player | Bear)[],
  now: number,
  dt: number,
  hurt: (target: Player | Bear, damage: number) => void,
) {
  scene.projectiles = (scene.projectiles ?? []).filter((shot) => {
    if (now >= shot.expiresAt) {
      return false;
    }

    const steps = Math.max(
      1,
      Math.ceil((Math.hypot(shot.vx, shot.vy) * dt) / PROJECTILE_STEP_PIXELS),
    );

    for (let i = 0; i < steps; i++) {
      shot.x = wrap(shot.x + (shot.vx * dt) / steps, FOREST.width);
      shot.y = wrap(shot.y + (shot.vy * dt) / steps, FOREST.height);

      if (
        forestTrees(
          shot.x,
          shot.y + COLLISION.feetOffset,
          PROJECTILE_TREE_COLLISION.queryRadius,
        ).some((t) => {
          return (
            Math.hypot(shot.x - t.x, shot.y + COLLISION.feetOffset - t.y) <
            PROJECTILE_TREE_COLLISION.contactRadius
          );
        })
      ) {
        return false;
      }

      const hit = combatants.find((p) => {
        return (
          p.hitpoints > 0 && overlapsBody(shot, COLLISION.enemyProjectileRadius, modelHitbox(p))
        );
      });

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
