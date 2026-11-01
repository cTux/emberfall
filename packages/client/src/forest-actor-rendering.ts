import type { WorldDrawingContext } from './rendering/drawing-context';
import type { Player, WorldState, DamageEvent } from '@emberfall/common';
import { enemyMaxHealth } from '@emberfall/core';
import type { GraphicsSettings } from './graphics';
import { ACTOR_CELL, idleBreath } from './animation';
import { forestActorMask, type ForestActor } from './forest-actors';
import { drawPlayerDetails } from './player-rendering';
import { drawTargetHit, drawPartyOutline, drawPlayerHealth } from './effects';
import { partyAction } from './interaction-targets';
import { drawDebuffs } from './combat-effects';
import { drawWorldBar } from './world-bar';

import { FOREST_ACTOR } from './forest-calibration.ts';

export type ActorFrame = {
  world: WorldState | null;
  players: Player[];
  playerId: string;
  now: number;
  serverTime: number;
  quality: GraphicsSettings;
  highlightInteractions: boolean;
};
export function drawForestActor(
  ctx: WorldDrawingContext,
  a: ForestActor,
  hit: DamageEvent | undefined,
  frame: ActorFrame,
) {
  const { world, players, playerId, now, serverTime, quality, highlightInteractions } = frame;

  if (!a.image.naturalWidth) {
    return;
  }

  if (a.enemy?.hitpoints === 0 && hit?.killed) {
    const progress = Math.max(0, Math.min(1, (serverTime - hit.at) / FOREST_ACTOR.deathFadeMs));
    ctx.save();
    ctx.translate(a.x, a.y + FOREST_ACTOR.footOffset);
    ctx.globalAlpha = 1 - progress;
    ctx.drawImage(
      a.image,
      a.facing * ACTOR_CELL,
      FOREST_ACTOR.fallenRow * ACTOR_CELL,
      ACTOR_CELL,
      ACTOR_CELL,
      -a.size / 2,
      -a.size * 0.94,
      a.size,
      a.size,
    );
    drawTargetHit(
      ctx,
      forestActorMask(a.image, a.facing, FOREST_ACTOR.fallenRow),
      -a.size / 2,
      -a.size * 0.94,
      a.size,
      a.size,
      serverTime - hit.at,
    );
    ctx.restore();

    return;
  }

  const left = a.x - a.size / 2,
    top =
      a.y + FOREST_ACTOR.footOffset - (a.size * FOREST_ACTOR.bodyHeight) / FOREST_ACTOR.playerSize;
  const bodyOpacity = a.player?.hitpoints === 0 ? FOREST_ACTOR.deadOpacity : 1;
  ctx.globalAlpha = bodyOpacity;

  if (quality.motionBlur && a.moving) {
    ctx.globalAlpha = FOREST_ACTOR.motionOpacity * bodyOpacity;
    ctx.drawImage(
      a.image,
      a.facing * ACTOR_CELL,
      a.row * ACTOR_CELL,
      ACTOR_CELL,
      ACTOR_CELL,
      left - a.dx * FOREST_ACTOR.trailScale,
      top - a.dy * FOREST_ACTOR.trailScale,
      a.size,
      a.size,
    );
    ctx.globalAlpha = bodyOpacity;
  }

  ctx.spriteTint = a.player?.reconnecting ? '#ff5555' : '#ffffff';
  const breath = idleBreath(now, a.row);
  ctx.drawImage(
    a.image,
    a.facing * ACTOR_CELL,
    a.row * ACTOR_CELL,
    ACTOR_CELL,
    ACTOR_CELL,
    left,
    top + a.size * (1 - breath),
    a.size,
    a.size * breath,
  );
  ctx.spriteTint = '#ffffff';
  const highlightPlayer =
    highlightInteractions &&
    !!a.player &&
    !!partyAction(
      world,
      players.find((player) => {
        return player.id === playerId;
      }),
      a.player,
    );

  if (
    highlightPlayer ||
    (a.player &&
      world?.partyRequests?.some((r) => {
        return r.fromId === a.player.id;
      }))
  ) {
    drawPartyOutline(
      ctx,
      forestActorMask(a.image, a.facing, a.row),
      left,
      top + a.size * (1 - breath),
      a.size,
      a.size * breath,
      highlightPlayer,
    );
  }

  if (hit && (a.enemy || a.player?.id === playerId)) {
    drawTargetHit(
      ctx,
      forestActorMask(a.image, a.facing, a.row),
      left,
      top,
      a.size,
      a.size,
      serverTime - hit.at,
    );
  }

  ctx.globalAlpha = 1;
  ctx.occlusion = false;

  if (a.enemy) {
    if (a.enemy.kind === 'boss') {
      const width = drawPlayerHealth(
        ctx,
        a.x,
        top - FOREST_ACTOR.bossHealthGap,
        a.enemy.hitpoints,
        enemyMaxHealth(a.enemy, world?.scene?.difficulty),
        a.enemy.name ?? 'The Hollow Warden',
        '#ffffff',
        true,
      );
      drawDebuffs(ctx, a.enemy, a.x - width / 2, top - FOREST_ACTOR.bossDebuffGap, serverTime);
    } else {
      drawWorldBar(
        ctx,
        a.x - FOREST_ACTOR.enemyDebuffHalfWidth,
        top - 3,
        34,
        a.enemy.hitpoints / enemyMaxHealth(a.enemy, world?.scene?.difficulty),
        a.enemy.kind === 'elite' ? '#f4d447' : '#df7765',
      );
      drawDebuffs(
        ctx,
        a.enemy,
        a.x - FOREST_ACTOR.enemyDebuffHalfWidth,
        top - FOREST_ACTOR.enemyDebuffGap,
        serverTime,
      );
    }
  }

  if (a.player) {
    drawPlayerDetails(ctx, a.player, a.x, a.y);
  }
}
