import { WARDROBE, BUILDINGS, TORCHES, TREES } from "@emberfall/common-new";
import { makeMask, castShadow } from "./lighting";
import type { Caster, Light } from "./lighting";
import { environmentArt, wardrobeArt } from "./art";
import { chimneyAnchors } from "./ambient-art";

export interface Scenery extends Caster {
  sprite: HTMLCanvasElement;
  name?: string;
  chimney?: { x: number; y: number };
}
export function villageSprites(
  _nature: HTMLImageElement,
  _houses: HTMLImageElement,
  _wardrobe: HTMLImageElement,
  _lampPost: HTMLImageElement,
  _lantern: HTMLImageElement,
): Scenery[] {
  const objects: Scenery[] = [];
  const sprites = new Map<
    CanvasImageSource,
    Map<string, { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }>
  >();
  function add(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    source: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    name?: string,
  ) {
    let frames = sprites.get(source);
    if (!frames) sprites.set(source, (frames = new Map()));
    const key = `${sx}:${sy}:${sw}:${sh}`;
    let frame = frames.get(key);
    if (!frame) {
      const sprite = document.createElement("canvas");
      sprite.width = sw;
      sprite.height = sh;
      sprite.getContext("2d")!.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
      frame = { sprite, mask: makeMask(sprite) };
      frames.set(key, frame);
    }
    objects.push({ id, x, y, width, height, ...frame, name });
  }
  if (environmentArt.naturalWidth) {
    TREES.forEach((t, i) =>
      add(`tree:${i}`, t.x, t.y - 8, t.size, t.size, environmentArt, (i % 2) * 128, 128, 128, 128),
    );
  }
  if (environmentArt.naturalWidth)
    BUILDINGS.forEach((b, i) => {
      add(
        `building:${b.id}`,
        b.x,
        b.y,
        b.sourceWidth * 2,
        96,
        environmentArt,
        (i % 3) * 128,
        0,
        128,
        128,
        b.name,
      );
      const anchor = chimneyAnchors[i % 3];
      objects.at(-1)!.chimney = { x: (anchor.x - 0.5) * b.sourceWidth * 2, y: (anchor.y - 1) * 96 };
    });
  if (wardrobeArt.naturalWidth)
    add(
      "building:wardrobe",
      WARDROBE.x,
      WARDROBE.y,
      60,
      64,
      wardrobeArt,
      0,
      0,
      128,
      128,
      "Wardrobe",
    );
  if (environmentArt.naturalWidth)
    TORCHES.forEach((t, i) =>
      add(`torch:${i}`, t.x, t.y, 42, 64, environmentArt, 0, 256, 128, 128),
    );
  return objects.sort((a, b) => a.y - b.y);
}
export const TORCH_LIGHTS: Light[] = TORCHES.map((t, i) => ({
  ...t,
  height: 85,
  radius: 145,
  strength: 0.24,
  owner: `torch:${i}`,
}));

let hangingLamp: { post: HTMLCanvasElement; lamp: HTMLCanvasElement } | undefined;

/** Split the existing painting once: one fixed post and one suspended lantern. */
export function drawTorchFire(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  now: number,
  particles: boolean,
  bloom: boolean,
  width = 42,
  height = 64,
) {
  if (!environmentArt.naturalWidth) return;
  if (!hangingLamp) {
    const post = document.createElement("canvas");
    post.width = post.height = 128;
    const paint = post.getContext("2d")!;
    paint.drawImage(environmentArt, 0, 256, 128, 128, 0, 0, 128, 128);
    const lamp = document.createElement("canvas");
    lamp.width = 27;
    lamp.height = 46;
    lamp.getContext("2d")!.drawImage(post, 69, 28, 27, 46, 0, 0, 27, 46);
    paint.clearRect(69, 28, 27, 46);
    hangingLamp = { post, lamp };
  }
  ctx.save();
  ctx.translate(x - width / 2, y - height);
  ctx.scale(width / 128, height / 128);
  ctx.drawImage(hangingLamp.post, 0, 0);
  ctx.translate(82, 28);
  // Time-only phase stays continuous when projected coordinates wrap.
  ctx.rotate(Math.sin(now / 1500) * 0.065 + Math.sin(now / 3700) * 0.02);
  ctx.drawImage(hangingLamp.lamp, -13, 0);
  const opacity = ctx.globalAlpha;
  ctx.globalAlpha = opacity * (0.08 + Math.sin(now / 113) * 0.035);
  ctx.fillStyle = "#ffd477";
  ctx.fillRect(-3, 26, 6, 10);
  if (particles) {
    if (bloom) {
      ctx.shadowBlur = 3;
      ctx.shadowColor = "#ff8b32";
    }
    for (let i = 0; i < 4; i++) {
      const age = ((now + i * 450) % 1800) / 1800;
      ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * 0.45;
      ctx.fillRect(Math.sin(i * 2.4 + age) * 5, 25 - age * 24, 1, 1);
    }
  }
  ctx.restore();
}

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
  base?: HTMLCanvasElement,
) {
  const key = `${base ? "occlusion" : "glow"}:${light.owner ?? `${light.x}:${light.y}`}`;
  const blockers = shadows
    ? casters.filter(
        (caster) =>
          caster.id !== light.owner &&
          Math.hypot(caster.x - light.x, caster.y - light.y) < light.radius,
      )
    : [];
  // Camera translation cancels out. Only silhouettes inside the light radius
  // can change this texture; flicker is applied to the resulting sprite.
  const revision =
    (base as (HTMLCanvasElement & { textureRevision?: number }) | undefined)?.textureRevision ?? 0;
  const signature =
    `${light.radius}:${light.height}:${light.strength}:${revision}:` +
    blockers
      .map(
        (caster) => `${caster.x - light.x},${caster.y - light.y},${caster.width},${caster.height}`,
      )
      .join(";");
  let entry = lightCanvases.get(key);
  if (
    entry?.signature === signature &&
    entry.base === base &&
    blockers.every((caster, index) => caster.mask === entry!.masks[index])
  )
    return entry.canvas;
  const canvas = entry?.canvas ?? document.createElement("canvas");
  entry = { canvas, signature, masks: blockers.map((caster) => caster.mask), base };
  lightCanvases.set(key, entry);
  if (lightCanvases.size > 64) lightCanvases.delete(lightCanvases.keys().next().value!);
  if (canvas.width !== light.radius * 2) canvas.width = canvas.height = light.radius * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  if (base) ctx.drawImage(base, 0, 0);
  ctx.translate(light.radius - light.x, light.radius - light.y);
  if (!base) {
    const glow = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, light.radius);
    glow.addColorStop(0, `rgba(255, 190, 95, ${light.strength})`);
    glow.addColorStop(1, "rgba(255, 160, 65, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(
      light.x - light.radius,
      light.y - light.radius,
      light.radius * 2,
      light.radius * 2,
    );
  }
  if (shadows) {
    ctx.globalCompositeOperation = "destination-out";
    for (const caster of blockers) castShadow(ctx, caster, light);
  }
  const dynamic = canvas as HTMLCanvasElement & { textureRevision?: number };
  dynamic.textureRevision = (dynamic.textureRevision ?? 0) + 1;
  return canvas;
}
