import { attackTarget } from '../tactics.ts';
import { DEFAULT_TACTICS, type Tactics, wrappedDelta, wrap } from '@emberfall/common';
import { BEAR_DEFINITION } from '../definitions/entities/companions.ts';
import { FOREST, forestDistance } from '../scene.ts';
import type { Player, Bear, SceneState, Enemy } from '@emberfall/common';

export const companionDecisions = new WeakMap<
  Bear,
  {
    at: number;
    scene: SceneState | undefined;
    forest: boolean;
    tactics: Tactics;
    target: Enemy | undefined;
    following: boolean;
    destination: { x: number; y: number; hitpoints: number };
  }
>();

export function decideCompanion(
  bear: Bear,
  player: Player,
  scene: SceneState | undefined,
  now: number,
  huntRadius: number,
) {
  const tactics = player.tactics ?? DEFAULT_TACTICS;
  const forest = player.scene === 'forest';
  let decision = companionDecisions.get(bear);
  if (
    !decision ||
    now - decision.at >= BEAR_DEFINITION.decisionMs ||
    decision.scene !== scene ||
    decision.forest !== forest ||
    decision.tactics !== tactics
  ) {
    const candidates = scene?.enemies.filter((e) => forestDistance(e, player) <= huntRadius) ?? [];
    const assist =
      tactics.companionTarget === 'assist'
        ? candidates.find((e) => e.id === player.attackTargetId && e.hitpoints > 0)
        : undefined;
    const target =
      tactics.stance !== 'passive' &&
      (forest || scene?.training) &&
      scene?.phase === 'active' &&
      !bear.returning
        ? (assist ??
          attackTarget(
            tactics.companionTarget === 'nearOwner' ? player : bear,
            candidates,
            Infinity,
            tactics.companionTarget === 'nearOwner' ? DEFAULT_TACTICS : tactics,
            decision?.target?.id,
          ))
        : undefined;
    let destination: { x: number; y: number; hitpoints: number } = target ?? player;
    const heading = Math.atan2(
      wrappedDelta(destination.y, bear.y, FOREST.height),
      wrappedDelta(destination.x, bear.x, FOREST.width),
    );
    bear.attackAngle = heading;
    if (target) {
      // Keep claws in range while staying outside ordinary melee reach.
      const spacing = BEAR_DEFINITION.spacing;
      destination = {
        x: wrap(target.x - Math.cos(heading) * spacing, FOREST.width),
        y: wrap(target.y - Math.sin(heading) * spacing, FOREST.height),
        hitpoints: 1,
      };
    }
    const danger =
      tactics.avoidHazards && forest && scene?.phase === 'active'
        ? scene.enemies.find(
            (e) =>
              e.hitpoints > 0 &&
              e.attack &&
              e.attack.endsAt >= now &&
              forestDistance(bear, e.attack) < e.attack.radius + 12,
          )?.attack
        : undefined;
    if (danger) {
      const away =
        forestDistance(bear, danger) < 1
          ? heading + Math.PI
          : Math.atan2(
              wrappedDelta(bear.y, danger.y, FOREST.height),
              wrappedDelta(bear.x, danger.x, FOREST.width),
            );
      destination = {
        x: wrap(danger.x + Math.cos(away) * (danger.radius + 16), FOREST.width),
        y: wrap(danger.y + Math.sin(away) * (danger.radius + 16), FOREST.height),
        hitpoints: 1,
      };
    }
    if (tactics.avoidHazards && forest && scene?.phase === 'active') {
      const shot = scene.projectiles?.find((s) => {
        const dx = wrappedDelta(bear.x, s.x, FOREST.width),
          dy = wrappedDelta(bear.y, s.y, FOREST.height);
        const speedSquared = s.vx * s.vx + s.vy * s.vy;
        if (s.expiresAt <= now || speedSquared === 0) return false;
        const time = (dx * s.vx + dy * s.vy) / speedSquared;
        return (
          time >= 0 &&
          time <= Math.min(0.35, (s.expiresAt - now) / 1000) &&
          Math.hypot(dx - s.vx * time, dy - s.vy * time) < 30
        );
      });
      if (shot) {
        const speed = Math.hypot(shot.vx, shot.vy);
        const side =
          wrappedDelta(bear.x, shot.x, FOREST.width) * -shot.vy +
            wrappedDelta(bear.y, shot.y, FOREST.height) * shot.vx >=
          0
            ? 1
            : -1;
        destination = {
          x: wrap(bear.x - (shot.vy / speed) * 40 * side, FOREST.width),
          y: wrap(bear.y + (shot.vx / speed) * 40 * side, FOREST.height),
          hitpoints: 1,
        };
      }
    }
    decision = {
      at: now,
      scene,
      forest,
      tactics,
      target,
      following: destination === player,
      destination: { ...destination },
    };
    companionDecisions.set(bear, decision);
  }

  return decision;
}
