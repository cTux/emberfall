import type { WorldDrawingContext } from './rendering/drawing-context';
import type { ForestActor } from './forest-actors';

/** Match forest scenery's baked fallback shadows when projected shadows are disabled. */
import type { Caster } from './lighting';
import { FOREST_PLAYER_LIGHT, FOREST_ACTOR } from './forest-calibration.ts';
import { lightTexture } from './light-texture';

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
