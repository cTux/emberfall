import { castShadow } from './lighting';
import type { Caster, Light } from './lighting';

const lightCanvases = new Map<
  string,
  {
    canvas: HTMLCanvasElement;
    signature: string;
    masks: CanvasImageSource[];
    base?: HTMLCanvasElement;
  }
>();
/** Light contribution with silhouette occlusion. The canvas bounds limit shadow reach. */
export function lightTexture(
  light: Light,
  casters: readonly Caster[],
  shadows: boolean,
  base?: HTMLCanvasElement & { textureRevision?: number },
) {
  const key = `${base ? 'occlusion' : 'glow'}:${light.owner ?? `${light.x}:${light.y}`}`;
  const blockers = shadows
    ? casters.filter((caster) => {
        return (
          caster.id !== light.owner &&
          Math.hypot(caster.x - light.x, caster.y - light.y) < light.radius
        );
      })
    : [];
  // Camera translation cancels out. Only silhouettes inside the light radius
  // can change this texture; flicker is applied to the resulting sprite.
  const revision = base?.textureRevision ?? 0;
  const signature =
    `${light.radius}:${light.height}:${light.strength}:${revision}:` +
    blockers
      .map((caster) => {
        return `${caster.x - light.x},${caster.y - light.y},${caster.width},${caster.height}`;
      })
      .join(';');
  let entry = lightCanvases.get(key);
  if (
    entry?.signature === signature &&
    entry.base === base &&
    blockers.every((caster, index) => {
      return caster.mask === entry!.masks[index];
    })
  ) {
    return entry.canvas;
  }

  const canvas = entry?.canvas ?? document.createElement('canvas');
  entry = {
    canvas,
    signature,
    masks: blockers.map((caster) => {
      return caster.mask;
    }),
    base,
  };
  lightCanvases.set(key, entry);
  if (lightCanvases.size > 64) {
    lightCanvases.delete(lightCanvases.keys().next().value!);
  }

  if (canvas.width !== light.radius * 2) {
    canvas.width = canvas.height = light.radius * 2;
  }

  const ctx = canvas.getContext('2d')!;
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (base) {
    ctx.drawImage(base, 0, 0);
  }

  ctx.translate(light.radius - light.x, light.radius - light.y);
  if (!base) {
    const glow = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, light.radius);
    glow.addColorStop(0, `rgba(255, 190, 95, ${light.strength})`);
    glow.addColorStop(1, 'rgba(255, 160, 65, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(
      light.x - light.radius,
      light.y - light.radius,
      light.radius * 2,
      light.radius * 2,
    );
  }

  if (shadows) {
    ctx.globalCompositeOperation = 'destination-out';
    for (const caster of blockers) {
      castShadow(ctx, caster, light);
    }
  }

  const dynamic = canvas as HTMLCanvasElement & { textureRevision?: number };
  dynamic.textureRevision = (dynamic.textureRevision ?? 0) + 1;

  return canvas;
}
