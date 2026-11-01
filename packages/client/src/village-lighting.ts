import type { DrawingContext } from './rendering/drawing-context';
import type { VillageFrame } from './village-frame';
import type { VillagePlayers } from './village-players';
import type { Player } from '@emberfall/common';
import type { Caster, Light } from './lighting';
import type { dayNight } from './day-night';
import { TORCH_LIGHTS, lightTexture } from './village';

// Keep the existing ±10% flicker; the lantern offsets align light with the actor's held lamp in each facing.
const LANTERN_LIGHT = {
  baseAlpha: 0.9,
  flickerMs: 190,
  flickerAlpha: 0.1,
  leftFacing: 2,
  leftX: -15,
  rightX: 12,
};

type LightFrame = Pick<
  VillageFrame,
  'quality' | 'now' | 'project' | 'camera' | 'torchTextures' | 'visibleScenery'
>;
export function drawVillageLighting(
  ctx: DrawingContext,
  frame: LightFrame,
  dynamic: Caster[],
  players: Player[],
  poses: Pick<VillagePlayers, 'pose'>,
  cycle: ReturnType<typeof dayNight>,
) {
  const {
    quality,
    now,
    project,
    torchTextures,
    visibleScenery,
    camera: { x: cameraX, y: cameraY, width: viewWidth, height: viewHeight },
  } = frame;

  if (quality.lighting) {
    ctx.save();
    ctx.fillStyle = '#f3ca7a09';
    ctx.fillRect(cameraX, cameraY, viewWidth, viewHeight);
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < TORCH_LIGHTS.length; i++) {
      const source = TORCH_LIGHTS[i];
      const light = { ...source, ...project(source.x, source.y) };

      if (
        light.x + light.radius < cameraX ||
        light.x - light.radius > cameraX + viewWidth ||
        light.y + light.radius < cameraY ||
        light.y - light.radius > cameraY + viewHeight
      ) {
        continue;
      }

      const texture = torchTextures[i];

      if (!texture) {
        continue;
      }

      const movingLight = lightTexture(
        light,
        [
          ...dynamic,
          ...visibleScenery.filter((object) => {
            return object.frames || object.id.startsWith('tree:') || object.kind;
          }),
        ],
        quality.shadows,
        texture,
      );
      ctx.globalAlpha =
        cycle.lightAlpha *
        (LANTERN_LIGHT.baseAlpha +
          Math.sin(now / LANTERN_LIGHT.flickerMs + i) * LANTERN_LIGHT.flickerAlpha);
      ctx.drawImage(movingLight, light.x - light.radius, light.y - light.radius);
    }

    ctx.globalAlpha = cycle.lightAlpha;

    for (const player of players) {
      const pos = poses.pose(player);
      const lantern: Light = {
        x:
          pos.x +
          (pos.facing === LANTERN_LIGHT.leftFacing ? LANTERN_LIGHT.leftX : LANTERN_LIGHT.rightX),
        y: pos.y + 15,
        height: 28,
        radius: 110,
        strength: 0.18,
        owner: player.id,
      };
      ctx.drawImage(
        lightTexture(lantern, [...visibleScenery, ...dynamic], quality.shadows),
        lantern.x - lantern.radius,
        lantern.y - lantern.radius,
      );
    }

    ctx.restore();
  }
}
