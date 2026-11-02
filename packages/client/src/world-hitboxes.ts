import type { Hitbox } from './hitbox.ts';
import type { WorldState } from '@emberfall/core/contracts';
import {
  PLAYER_ATTACK_DURATION,
  game,
  defaultSpellRange,
  ENEMY_STATS,
  INTERACTION_RADIUS,
  forestTrees,
  TREES,
  TORCHES,
  WARDROBE,
  LOBBY_PORTAL,
  BUILDINGS,
  INNKEEPER,
} from '@emberfall/core';
import { HITBOX_COLORS, HITBOX_PRESENTATION } from './hitbox-calibration.ts';
import { modelHitbox, enemyHitbox } from '@emberfall/core/hitboxes';
import { BEAR_DEFINITION } from '@emberfall/core/definitions/entities/companions';
import { COLLISION } from '@emberfall/core/definitions/collision';
import { PICKUP_RULES } from '@emberfall/core/definitions/entities/pickups';
import { ATTACK_DEFINITIONS } from '@emberfall/core/definitions/abilities/attacks';

/** Displayed poses, shared rule dimensions. Decorations deliberately have no shapes. */
export function worldHitboxes(
  world: WorldState,
  forest: boolean,
  view: { x: number; y: number; width: number; height: number },
): Hitbox[] {
  const shapes: Hitbox[] = [];
  const circle = (x: number, y: number, radius: number, color: string, label?: string) => {
    return shapes.push({ x, y, radius, color, label });
  };

  const scene = forest ? world.scene : world.training;
  const now = scene?.pausedAt ?? world.serverNow ?? 0;
  const swing = (
    actor: { x: number; y: number; attackAt?: number; attackAngle?: number },
    range: number,
  ) => {
    if (
      actor.attackAt !== undefined &&
      now >= actor.attackAt &&
      now - actor.attackAt < PLAYER_ATTACK_DURATION
    ) {
      shapes.push({
        x: actor.x,
        y: actor.y,
        radius: range,
        angle: actor.attackAngle ?? 0,
        color: HITBOX_COLORS.range,
        label: 'melee',
      });
    }
  };

  for (const player of world.players) {
    if ((player.scene === 'forest') !== forest || player.hitpoints <= 0) {
      continue;
    }

    const body = modelHitbox(player);
    circle(body.x, body.y, body.radius, HITBOX_COLORS.body, 'body');

    if (
      game.registries.abilities.require(
        game.registries.classes.require(player.classId ?? 'warrior').attack,
      ).kind === 'slash'
    ) {
      swing(player, defaultSpellRange(player));
    }

    const bear = player.bear;

    if (bear && bear.hitpoints > 0) {
      const body = modelHitbox(bear);
      circle(body.x, body.y, body.radius, HITBOX_COLORS.body, 'body');
      swing(bear, bear.range ?? BEAR_DEFINITION.range);
    }
  }

  for (const enemy of scene?.enemies ?? []) {
    if (enemy.hitpoints <= 0) {
      continue;
    }

    const body = enemyHitbox(enemy);
    circle(body.x, body.y, body.radius, HITBOX_COLORS.body, 'body');

    if (enemy.attack) {
      circle(enemy.attack.x, enemy.attack.y, enemy.attack.radius, HITBOX_COLORS.range, 'attack');
    }
  }

  for (const shot of scene?.playerShots ?? []) {
    circle(shot.x, shot.y, COLLISION.playerProjectileRadius, HITBOX_COLORS.projectile);
  }

  for (const shot of scene?.projectiles ?? []) {
    circle(shot.x, shot.y, COLLISION.enemyProjectileRadius, HITBOX_COLORS.projectile);
  }

  for (const drop of scene?.drops ?? []) {
    circle(drop.x, drop.y, PICKUP_RULES.collectRadius, HITBOX_COLORS.range, 'collect');
  }

  for (const explosion of scene?.explosions ?? []) {
    circle(
      explosion.x,
      explosion.y,
      ATTACK_DEFINITIONS.fireball.splashRadius,
      HITBOX_COLORS.range,
      'splash',
    );
  }

  if (forest) {
    for (const spawn of scene?.spawns ?? []) {
      circle(
        spawn.x,
        spawn.y,
        ENEMY_STATS[spawn.archetype ?? 'skeleton'].radius,
        HITBOX_COLORS.body,
        'spawn',
      );
    }

    for (const portal of scene?.portals ?? []) {
      circle(portal.x, portal.y, INTERACTION_RADIUS, HITBOX_COLORS.range, 'interact');
    }

    for (const tree of forestTrees(
      view.x + view.width / 2,
      view.y + view.height / 2,
      Math.max(view.width, view.height) / 2 + HITBOX_PRESENTATION.sceneryMargin,
    )) {
      circle(tree.x, tree.y, tree.radius, HITBOX_COLORS.scenery);
    }
  } else {
    for (const tree of TREES) {
      circle(
        tree.x,
        tree.y - HITBOX_PRESENTATION.treeCenterOffset,
        tree.radius,
        HITBOX_COLORS.scenery,
      );
    }

    for (const torch of TORCHES) {
      circle(torch.x, torch.y, HITBOX_PRESENTATION.torchRadius, HITBOX_COLORS.scenery);
    }

    circle(WARDROBE.x, WARDROBE.y, HITBOX_PRESENTATION.wardrobeRadius, HITBOX_COLORS.scenery);
    // Interaction checks use player.y + 15; shift these ranges into the body coordinate frame.
    circle(
      WARDROBE.x,
      WARDROBE.y - COLLISION.feetOffset,
      HITBOX_PRESENTATION.wardrobeReach,
      HITBOX_COLORS.range,
      'interact',
    );
    circle(
      LOBBY_PORTAL.x,
      LOBBY_PORTAL.y - COLLISION.feetOffset,
      INTERACTION_RADIUS,
      HITBOX_COLORS.range,
      'interact',
    );

    for (const building of BUILDINGS) {
      shapes.push({
        x: building.x - building.sourceWidth + 8,
        y: building.y - 40,
        width: 2 * (building.sourceWidth - 8),
        height: 40,
        color: HITBOX_COLORS.scenery,
      });

      if (building.id !== 'inn') {
        circle(
          building.doorX,
          building.y + HITBOX_PRESENTATION.doorOffset - COLLISION.feetOffset,
          INTERACTION_RADIUS,
          HITBOX_COLORS.range,
          'interact',
        );
      }
    }

    circle(
      (
        world.npcs?.find((n) => {
          return n.id === INNKEEPER.id;
        }) ?? INNKEEPER
      ).x,
      (
        world.npcs?.find((n) => {
          return n.id === INNKEEPER.id;
        }) ?? INNKEEPER
      ).y - COLLISION.feetOffset,
      INTERACTION_RADIUS,
      HITBOX_COLORS.range,
      'interact',
    );
  }

  return shapes;
}
