import type { Player, WorldState } from '@emberfall/common';
import { wrappedDelta } from '@emberfall/common';
import { game, ENEMY_STATS, FOREST } from '@emberfall/core';
import { actorArt } from './art';
import { characterImages } from './characters';
import { ACTOR_CELL, playerFrame, enemyFrame } from './animation';
import { movementFacing } from './facing';
import { spriteMask, type Caster } from './lighting';

export type ForestProjection = {
  cx: number;
  cy: number;
  width: number;
  height: number;
  near: (x: number, y: number) => { x: number; y: number };
};
export function forestActorMask(image: HTMLImageElement, column: number, row: number) {
  return spriteMask(image, column, row, false, ACTOR_CELL, false, ACTOR_CELL)!;
}

export function createForestActors(skeleton: HTMLImageElement) {
  const enemyImages = Object.fromEntries(
    ['runner', 'brute', 'caster', 'warden'].map((name) => {
      return [name, actorArt(name)];
    }),
  );
  const positions = new Map<string, { x: number; y: number; facing: number }>();
  let lastScene: string | undefined;

  return (
    world: WorldState | null,
    players: Player[],
    playerId: string,
    projection: ForestProjection,
    now: number,
    serverTime: number,
  ) => {
    const { cx, cy, width, height, near } = projection;
    if (world?.scene?.id !== lastScene) {
      positions.clear();
      lastScene = world?.scene?.id;
    }

    const casters: Caster[] = [];
    const actors = [
      ...players.map((p) => {
        return { id: p.id, x: p.x, y: p.y, player: p, enemy: null };
      }),
      ...(world?.scene?.enemies ?? []).map((e) => {
        return {
          id: `enemy:${e.id}`,
          x: e.x,
          y: e.y,
          player: null,
          enemy: e,
        };
      }),
      ...(
        world?.scene?.damage.filter((d) => {
          return d.killed && d.target.startsWith('enemy:') && serverTime - d.at < 700;
        }) ?? []
      ).map((d) => {
        return {
          id: d.target,
          x: d.x,
          y: d.y,
          player: null,
          enemy: {
            name: undefined,
            debuffs: undefined,
            attack: undefined,
            cooldownUntil: undefined,
            archetype: 'skeleton' as const,
            id: 0,
            x: d.x,
            y: d.y,
            hitpoints: 0,
            angle: 0,
            kind: 'normal' as const,
            ...d.enemy,
          },
        };
      }),
    ];
    const live = new Set(
      actors.map((a) => {
        return a.id;
      }),
    );
    for (const id of positions.keys()) {
      if (!live.has(id)) {
        positions.delete(id);
      }
    }

    const damageByTarget = new Map(
      world?.scene?.damage.map((d) => {
        return [d.target, d];
      }),
    );
    const rendered = actors
      .filter((a) => {
        return (
          Math.abs(wrappedDelta(a.x, cx, FOREST.width)) < width / 2 + 100 &&
          Math.abs(wrappedDelta(a.y, cy, FOREST.height)) < height / 2 + 100
        );
      })
      .map((actor) => {
        const pos = positions.get(actor.id) ?? { x: actor.x, y: actor.y, facing: 0 };
        const dx = wrappedDelta(actor.x, pos.x, FOREST.width),
          dy = wrappedDelta(actor.y, pos.y, FOREST.height);
        const ix = actor.player ? (actor.player.inputX ?? 0) : Math.cos(actor.enemy.angle),
          iy = actor.player ? (actor.player.inputY ?? 0) : Math.sin(actor.enemy.angle);
        const moving = actor.player ? Math.hypot(ix, iy) > 0 : Math.hypot(dx, dy) > 0.05;
        if (moving && Math.hypot(ix, iy) > 0) {
          pos.facing = movementFacing(ix, iy, pos.facing);
        }

        pos.x = actor.x;
        pos.y = actor.y;
        positions.set(actor.id, pos);
        const actorTime = actor.id === playerId ? now : serverTime;
        const point = near(pos.x, pos.y),
          row = actor.player
            ? playerFrame(actorTime, moving, actor.player.hitpoints > 0, actor.player.attackAt)
            : enemyFrame(
                serverTime,
                moving,
                actor.enemy.hitpoints > 0,
                actor.enemy.attack,
                (actor.enemy.cooldownUntil ?? -Infinity) -
                  ENEMY_STATS[actor.enemy.archetype ?? 'skeleton'].cooldown,
              ),
          image = actor.player
            ? characterImages[actor.player.classId ?? 'warrior'].walk
            : actor.enemy?.kind === 'boss'
              ? enemyImages.warden
              : (enemyImages[
                  game.registries.enemies.require(actor.enemy?.archetype ?? 'skeleton').art
                ] ?? skeleton);
        const size = actor.enemy ? ENEMY_STATS[actor.enemy.archetype ?? 'skeleton'].size : 48;
        if (row === 5 || row === 6) {
          const angle = actor.player?.attackAngle ?? actor.enemy?.angle ?? 0;
          pos.facing = movementFacing(Math.cos(angle), Math.sin(angle), pos.facing);
        }

        if (image.naturalWidth) {
          casters.push({
            id: actor.id,
            x: point.x,
            y: point.y + 15,
            width: size,
            height: size,
            mask: forestActorMask(image, pos.facing, row),
          });
        }

        return { ...actor, ...point, facing: pos.facing, row, image, size, moving, dx, dy };
      })
      .filter((a) => {
        return Math.abs(a.x - cx) < width / 2 + 80 && Math.abs(a.y - cy) < height / 2 + 80;
      });

    return { rendered, casters, damageByTarget };
  };
}

export type ForestActor = ReturnType<ReturnType<typeof createForestActors>>['rendered'][number];
