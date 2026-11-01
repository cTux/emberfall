import type { Player, WorldState } from '@emberfall/common';
import { wrappedDelta } from '@emberfall/common';
import { ARENA } from '@emberfall/core';
import type { WorldDrawingContext } from './rendering/drawing-context';
import type { GraphicsSettings } from './graphics';
import type { Preferences } from './preferences';
import { characterImages } from './characters';
import { ACTOR_CELL, playerFrame, idleBreath } from './animation';
import { movementFacing } from './facing';
import { spriteMask, type Caster } from './lighting';
import { partyAction } from './interaction-targets';
import { drawPartyOutline, drawPlayerHealth } from './effects';
import { drawPlayerDetails } from './player-rendering';

// Action rows come from the packaged actor sheet; three faint trailing samples retain the existing motion blur.
const PLAYER_PRESENTATION = {
  windupRow: 5,
  releaseRow: 6,
  trailSamples: 3,
  trailAlpha: 0.09,
  trailSpacing: 0.45,
};

// These anchors match the approved 48-unit actor placement, status row and detached cutout mask.
const ACTOR_LAYOUT = { size: 48, halfWidth: 24, feetOffset: 18, trailTop: 30, healthTop: 46 };

const colors = [
  '#efd086',
  '#86d9b6',
  '#99b9ef',
  '#ef99b3',
  '#c8a4ed',
  '#edaa79',
  '#a4cf7b',
  '#ddd',
];

export type VillageActorFrame = {
  view: WorldState;
  local?: Player;
  playerId: string;
  now: number;
  serverTime: number;
  quality: GraphicsSettings;
  preferences: Preferences;
  highlightInteractions: boolean;
};
export class VillagePlayers {
  private positions = new Map<string, { x: number; y: number; facing: number }>();

  clear() {
    this.positions.clear();
  }

  pose(player: Player): Readonly<{ x: number; y: number; facing: number }> {
    return this.positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
  }

  prepare(
    ctx: WorldDrawingContext,
    players: Player[],
    playerId: string,
    now: number,
    serverTime: number,
  ) {
    const liveIds = new Set(
      players.map((p) => {
        return p.id;
      }),
    );

    for (const id of this.positions.keys()) {
      if (!liveIds.has(id)) {
        this.positions.delete(id);
      }
    }

    const dynamic: Caster[] = [];

    for (const player of players) {
      const pos = this.positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
      const ix = player.inputX ?? 0,
        iy = player.inputY ?? 0;

      if (Math.hypot(ix, iy) > 0) {
        pos.facing = movementFacing(ix, iy, pos.facing);
      }

      const frame = playerFrame(
        player.id === playerId ? now : serverTime,
        Math.hypot(ix, iy) > 0,
        player.hitpoints > 0,
        player.attackAt,
      );

      if (frame === PLAYER_PRESENTATION.windupRow || frame === PLAYER_PRESENTATION.releaseRow) {
        pos.facing = movementFacing(
          Math.cos(player.attackAngle ?? 0),
          Math.sin(player.attackAngle ?? 0),
          pos.facing,
        );
      }

      const mask = spriteMask(
        characterImages[player.classId ?? 'warrior'].walk,
        pos.facing,
        frame,
        false,
        ACTOR_CELL,
        false,
        ACTOR_CELL,
      );

      if (mask && player.id === playerId) {
        const breath = idleBreath(now, frame);
        ctx.setPlayerCutout(
          mask,
          player.x - ACTOR_LAYOUT.halfWidth,
          player.y + ACTOR_LAYOUT.feetOffset - ACTOR_LAYOUT.size * breath,
          ACTOR_LAYOUT.size,
          ACTOR_LAYOUT.size * breath,
        );
      }

      if (mask) {
        dynamic.push({
          id: player.id,
          x: player.x,
          y: player.y + 15,
          width: 48,
          height: 48,
          mask,
        });
      }
    }

    return dynamic;
  }

  draw(ctx: WorldDrawingContext, player: Player, frame: VillageActorFrame) {
    const { view, local, playerId, now, serverTime, quality, preferences, highlightInteractions } =
      frame;
    const knight = characterImages[player.classId ?? 'warrior'].walk;
    const pos = this.positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
    const dx = wrappedDelta(player.x, pos.x, ARENA.width);
    const dy = wrappedDelta(player.y, pos.y, ARENA.height);
    const ix = player.inputX ?? 0,
      iy = player.inputY ?? 0;
    const moving = Math.hypot(ix, iy) > 0;
    const spriteRow = playerFrame(
      player.id === playerId ? now : serverTime,
      moving,
      player.hitpoints > 0,
      player.attackAt,
    );

    // Four directions share the same idle, walk, action and fallen rows.
    if (moving) {
      pos.facing = movementFacing(ix, iy, pos.facing);
    }

    if (
      spriteRow === PLAYER_PRESENTATION.windupRow ||
      spriteRow === PLAYER_PRESENTATION.releaseRow
    ) {
      pos.facing = movementFacing(
        Math.cos(player.attackAngle ?? 0),
        Math.sin(player.attackAngle ?? 0),
        pos.facing,
      );
    }

    pos.x = player.x;
    pos.y = player.y;
    this.positions.set(player.id, pos);
    ctx.globalAlpha = 1;
    ctx.spriteTint = player.reconnecting ? '#ff5555' : '#ffffff';

    if (knight.complete && knight.naturalWidth) {
      if (quality.motionBlur && moving) {
        // Sprite-only temporal samples keep HUD text and the world sharp.
        for (let sample = PLAYER_PRESENTATION.trailSamples; sample > 0; sample--) {
          ctx.globalAlpha = PLAYER_PRESENTATION.trailAlpha;
          ctx.drawImage(
            knight,
            pos.facing * ACTOR_CELL,
            spriteRow * ACTOR_CELL,
            ACTOR_CELL,
            ACTOR_CELL,
            pos.x - ACTOR_LAYOUT.halfWidth - dx * sample * PLAYER_PRESENTATION.trailSpacing,
            pos.y - ACTOR_LAYOUT.trailTop - dy * sample * PLAYER_PRESENTATION.trailSpacing,
            ACTOR_LAYOUT.size,
            ACTOR_LAYOUT.size,
          );
        }

        ctx.globalAlpha = 1;
      }

      ctx.drawImage(
        knight,
        pos.facing * ACTOR_CELL,
        spriteRow * ACTOR_CELL,
        ACTOR_CELL,
        ACTOR_CELL,
        pos.x - ACTOR_LAYOUT.halfWidth,
        pos.y + ACTOR_LAYOUT.feetOffset - ACTOR_LAYOUT.size * idleBreath(now, spriteRow),
        ACTOR_LAYOUT.size,
        ACTOR_LAYOUT.size * idleBreath(now, spriteRow),
      );
    }

    const highlightPlayer = highlightInteractions && !!partyAction(view, local, player);

    if (
      highlightPlayer ||
      view?.partyRequests?.some((r) => {
        return r.fromId === player.id;
      })
    ) {
      ctx.occlusion = false;
      const mask = spriteMask(knight, pos.facing, spriteRow, false, ACTOR_CELL, false, ACTOR_CELL);

      if (mask) {
        drawPartyOutline(
          ctx,
          mask,
          pos.x - ACTOR_LAYOUT.halfWidth,
          pos.y + ACTOR_LAYOUT.feetOffset - ACTOR_LAYOUT.size * idleBreath(now, spriteRow),
          ACTOR_LAYOUT.size,
          ACTOR_LAYOUT.size * idleBreath(now, spriteRow),
          highlightPlayer,
        );
      }
    }

    ctx.spriteTint = '#ffffff';
    ctx.occlusion = false;
    ctx.globalAlpha = 1;
    drawPlayerHealth(
      ctx,
      pos.x,
      pos.y - ACTOR_LAYOUT.healthTop,
      player.hitpoints,
      player.maxHitpoints,
      player.name,
      colors[player.color],
      false,
      !preferences.hideHealthBarsInTown,
    );
    drawPlayerDetails(ctx, player, pos.x, pos.y, false);
  }
}
