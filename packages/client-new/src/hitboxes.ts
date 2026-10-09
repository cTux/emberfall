import {
  ARENA,
  FOREST,
  TREES,
  BUILDINGS,
  TORCHES,
  WARDROBE,
  INNKEEPER,
  LOBBY_PORTAL,
  INTERACTION_RADIUS,
  ENEMY_STATS,
  forestTrees,
  wrappedDelta,
  defaultSpellRange,
  PLAYER_ATTACK_DURATION,
  type WorldState,
} from "@emberfall/common-new";
import { COLLISION } from "@emberfall/common-new/definitions/collision";
import { BEAR_DEFINITION } from "@emberfall/common-new/definitions/entities/companions";
import { PICKUP_RULES } from "@emberfall/common-new/definitions/entities/pickups";
import { ATTACK_DEFINITIONS } from "@emberfall/common-new/definitions/abilities/attacks";
import { modelHitbox, enemyHitbox } from "@emberfall/common-new/hitboxes";

export type Hitbox = {
  x: number;
  y: number;
  color: string;
  label?: string;
  angle?: number;
} & ({ radius: number } | { width: number; height: number });
export const HITBOX_COLORS = {
  body: "#00ffff",
  projectile: "#ff00ff",
  scenery: "#ffff00",
  range: "#ff8800",
} as const;

/** Displayed poses, shared rule dimensions. Decorations deliberately have no shapes. */
export function worldHitboxes(
  world: WorldState,
  forest: boolean,
  view: { x: number; y: number; width: number; height: number },
): Hitbox[] {
  const shapes: Hitbox[] = [];
  const circle = (x: number, y: number, radius: number, color: string, label?: string) =>
    shapes.push({ x, y, radius, color, label });
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
    )
      shapes.push({
        x: actor.x,
        y: actor.y,
        radius: range,
        angle: actor.attackAngle ?? 0,
        color: HITBOX_COLORS.range,
        label: "melee",
      });
  };
  for (const player of world.players) {
    if ((player.scene === "forest") !== forest || player.hitpoints <= 0) continue;
    const body = modelHitbox(player);
    circle(body.x, body.y, body.radius, HITBOX_COLORS.body, "body");
    if ((player.classId ?? "warrior") === "warrior") swing(player, defaultSpellRange(player));
    const bear = player.bear;
    if (bear && bear.hitpoints > 0) {
      const body = modelHitbox(bear);
      circle(body.x, body.y, body.radius, HITBOX_COLORS.body, "body");
      swing(bear, BEAR_DEFINITION.range);
    }
  }
  for (const enemy of scene?.enemies ?? []) {
    if (enemy.hitpoints <= 0) continue;
    const body = enemyHitbox(enemy);
    circle(body.x, body.y, body.radius, HITBOX_COLORS.body, "body");
    if (enemy.attack)
      circle(enemy.attack.x, enemy.attack.y, enemy.attack.radius, HITBOX_COLORS.range, "attack");
  }
  for (const shot of scene?.playerShots ?? [])
    circle(shot.x, shot.y, COLLISION.playerProjectileRadius, HITBOX_COLORS.projectile);
  for (const shot of scene?.projectiles ?? []) {
    circle(shot.x, shot.y, COLLISION.enemyProjectileRadius, HITBOX_COLORS.projectile);
  }
  for (const drop of scene?.drops ?? [])
    circle(drop.x, drop.y, PICKUP_RULES.collectRadius, HITBOX_COLORS.range, "collect");
  for (const explosion of scene?.explosions ?? [])
    circle(
      explosion.x,
      explosion.y,
      ATTACK_DEFINITIONS.fireball.splashRadius,
      HITBOX_COLORS.range,
      "splash",
    );
  if (forest) {
    for (const spawn of scene?.spawns ?? [])
      circle(
        spawn.x,
        spawn.y,
        ENEMY_STATS[spawn.archetype ?? "skeleton"].radius,
        HITBOX_COLORS.body,
        "spawn",
      );
    for (const portal of scene?.portals ?? [])
      circle(portal.x, portal.y, INTERACTION_RADIUS, HITBOX_COLORS.range, "interact");
    for (const tree of forestTrees(
      view.x + view.width / 2,
      view.y + view.height / 2,
      Math.max(view.width, view.height) / 2 + 150,
    ))
      circle(tree.x, tree.y, tree.radius, HITBOX_COLORS.scenery);
  } else {
    for (const tree of TREES) circle(tree.x, tree.y - 8, tree.radius, HITBOX_COLORS.scenery);
    for (const torch of TORCHES) circle(torch.x, torch.y, 5, HITBOX_COLORS.scenery);
    circle(WARDROBE.x, WARDROBE.y, 18, HITBOX_COLORS.scenery);
    // Interaction checks use player.y + 15; shift these ranges into the body coordinate frame.
    circle(WARDROBE.x, WARDROBE.y - COLLISION.feetOffset, 55, HITBOX_COLORS.range, "interact");
    circle(
      LOBBY_PORTAL.x,
      LOBBY_PORTAL.y - COLLISION.feetOffset,
      INTERACTION_RADIUS,
      HITBOX_COLORS.range,
      "interact",
    );
    for (const building of BUILDINGS) {
      shapes.push({
        x: building.x - building.sourceWidth + 8,
        y: building.y - 40,
        width: 2 * (building.sourceWidth - 8),
        height: 40,
        color: HITBOX_COLORS.scenery,
      });
      if (building.id !== "inn")
        circle(
          building.doorX,
          building.y + 24 - COLLISION.feetOffset,
          INTERACTION_RADIUS,
          HITBOX_COLORS.range,
          "interact",
        );
    }
    circle(
      INNKEEPER.x,
      INNKEEPER.y - COLLISION.feetOffset,
      INTERACTION_RADIUS,
      HITBOX_COLORS.range,
      "interact",
    );
  }
  return shapes;
}

/** Called after atmosphere/occlusion, using the same world transform as sprites. */
export function drawHitboxes(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  forest: boolean,
  view: { x: number; y: number; width: number; height: number },
) {
  const size = forest ? FOREST : ARENA;
  const cx = view.x + view.width / 2,
    cy = view.y + view.height / 2;
  let drawn = 0;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  for (const shape of worldHitboxes(world, forest, view)) {
    const width = "radius" in shape ? shape.radius * 2 : shape.width;
    const height = "radius" in shape ? shape.radius * 2 : shape.height;
    const x = cx + wrappedDelta(shape.x + ("radius" in shape ? 0 : width / 2), cx, size.width);
    const y = cy + wrappedDelta(shape.y + ("radius" in shape ? 0 : height / 2), cy, size.height);
    if (
      x + width / 2 < view.x ||
      x - width / 2 > view.x + view.width ||
      y + height / 2 < view.y ||
      y - height / 2 > view.y + view.height
    )
      continue;
    ctx.strokeStyle = shape.color;
    ctx.beginPath();
    if ("radius" in shape) {
      if (shape.angle !== undefined) {
        ctx.moveTo(x, y);
        ctx.arc(x, y, shape.radius, shape.angle - Math.PI / 2, shape.angle + Math.PI / 2);
        ctx.closePath();
      } else ctx.arc(x, y, shape.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    if (shape.label) {
      ctx.fillStyle = shape.color;
      ctx.fillText(shape.label, x, y - height / 2 - 3);
    }
    drawn++;
  }
  ctx.restore();
  return drawn;
}
