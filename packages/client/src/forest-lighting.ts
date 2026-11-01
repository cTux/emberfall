import type { WorldDrawingContext } from './rendering/drawing-context';
import { castShadow, type Caster } from './lighting';
import { lightTexture } from './light-texture';
import { FOREST_ACTOR, FOREST_PLAYER_LIGHT } from './forest-calibration.ts';
import type { ForestActor } from './forest-actors';

/** Match forest scenery's baked fallback shadows when projected shadows are disabled. */
export function drawForestShadows(
  ctx: WorldDrawingContext,
  casters: readonly Caster[],
  trees: readonly { x: number; y: number }[],
  enabled: boolean,
) {
  if (enabled) {
    for (const caster of casters) {
      castShadow(ctx, caster);
    }
  }

  if (!enabled) {
    ctx.fillStyle = '#07120955';

    for (const t of trees) {
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, 23, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Each living player's existing warm hand light shares the scene's silhouette casters. */
export function drawForestPlayerLights(
  ctx: WorldDrawingContext,
  rendered: readonly ForestActor[],
  casters: readonly Caster[],
  lightAlpha: number,
  shadows: boolean,
) {
  ctx.save();
  ctx.globalAlpha = lightAlpha;
  ctx.globalCompositeOperation = 'screen';

  for (const p of rendered.filter((a) => {
    return a.player && a.player.hitpoints > 0;
  })) {
    const light = {
      x:
        p.x +
        (p.facing === FOREST_PLAYER_LIGHT.leftFacing
          ? FOREST_PLAYER_LIGHT.leftHand
          : FOREST_PLAYER_LIGHT.rightHand),
      y: p.y + FOREST_ACTOR.footOffset,
      height: FOREST_PLAYER_LIGHT.height,
      radius: FOREST_PLAYER_LIGHT.radius,
      strength: FOREST_PLAYER_LIGHT.strength,
      owner: p.id,
    };
    ctx.drawImage(
      lightTexture(light, casters, shadows),
      light.x - light.radius,
      light.y - light.radius,
    );
  }

  ctx.restore();
}
