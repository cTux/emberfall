import {
  ARENA,
  WARDROBE,
  BUILDINGS,
  TORCHES,
  TREES,
  onPath,
  TRAINING_ZONES,
} from "@emberfall/common";
import { makeMask, castShadow } from "./lighting";
import type { Caster, Light } from "./lighting";
import type { GraphicsSettings } from "./graphics";

export interface Scenery extends Caster {
  sprite: HTMLCanvasElement;
  name?: string;
}
export function villageSprites(
  nature: HTMLImageElement,
  houses: HTMLImageElement,
  wardrobe: HTMLImageElement,
  lampPost: HTMLImageElement,
  lantern: HTMLImageElement,
  graphics: GraphicsSettings,
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
  if (nature.naturalWidth) {
    TREES.forEach((t, i) => add(`tree:${i}`, t.x, t.y - 8, t.size, t.size, nature, 32, 0, 32, 32));
    let seed = 713;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < (graphics.grass ? 850 : 325); i++) {
      const x = random() * ARENA.width,
        y = random() * ARENA.height;
      if (
        TRAINING_ZONES.some((zone) => Math.hypot(x - zone.x, y - zone.y) < zone.radius) ||
        onPath(x, y, 38) ||
        BUILDINGS.some((b) => Math.abs(x - b.x) < 85 && y > b.y - 105 && y < b.y + 20)
      )
        continue;
      const size = 12 + random() * 10;
      add(`grass:${i}`, x, y, size, size, nature, 64, 160, 16, 16);
    }
  }
  if (houses.naturalWidth)
    BUILDINGS.forEach((b) =>
      add(
        `building:${b.id}`,
        b.x,
        b.y,
        b.sourceWidth * 2,
        96,
        houses,
        b.sourceX,
        0,
        b.sourceWidth,
        48,
        b.name,
      ),
    );
  if (wardrobe.naturalWidth)
    add("building:wardrobe", WARDROBE.x, WARDROBE.y, 48, 60, wardrobe, 0, 0, 64, 80, "Wardrobe");
  if (lampPost.naturalWidth && lantern.naturalWidth) {
    const torch = document.createElement("canvas");
    torch.width = 32;
    torch.height = 96;
    const ctx = torch.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lampPost, 10, 24, 12, 72);
    ctx.drawImage(lantern, 4, 0, 24, 34);
    TORCHES.forEach((t, i) => add(`torch:${i}`, t.x, t.y, 20, 60, torch, 0, 0, 32, 96));
  }
  return objects.sort((a, b) => a.y - b.y);
}
export const TORCH_LIGHTS: Light[] = TORCHES.map((t, i) => ({
  ...t,
  height: 85,
  radius: 145,
  strength: 0.24,
  owner: `torch:${i}`,
}));

export function drawTorchFire(
  ctx: CanvasRenderingContext2D,
  lantern: HTMLImageElement,
  x: number,
  y: number,
  now: number,
  particles: boolean,
  bloom: boolean,
) {
  ctx.save();
  ctx.translate(x, y - 60);
  if (lantern.naturalWidth) {
    // Original sheet: 38 frames, seven 24x34 cells per row.
    const frame = Math.floor((now + x * 13 + y * 7) / 80) % 38;
    ctx.drawImage(
      lantern,
      (frame % 7) * 24,
      Math.floor(frame / 7) * 34,
      24,
      34,
      -7.5,
      0,
      15,
      21.25,
    );
  }
  if (particles) {
    const opacity = ctx.globalAlpha;
    if (bloom) {
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#ff8b32";
    }
    for (let i = 0; i < 12; i++) {
      const age = ((now + x * 13 + y * 7 + i * 137) % 1800) / 1800;
      const angle = i * 2.399963;
      ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * 0.8;
      ctx.fillStyle = ["#ffe6a3", "#ffac42", "#f45b28"][i % 3];
      ctx.fillRect(
        Math.round(Math.cos(angle) * (3 + age * 10)),
        Math.round(10 + Math.sin(angle) * 4 - age * 30),
        2,
        2,
      );
    }
  }
  ctx.restore();
}

/** Light contribution with silhouette occlusion. The canvas bounds limit shadow reach. */
export function lightTexture(
  light: Light,
  casters: readonly Caster[],
  shadows: boolean,
  canvas = document.createElement("canvas"),
) {
  if (canvas.width !== light.radius * 2) canvas.width = canvas.height = light.radius * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.translate(light.radius - light.x, light.radius - light.y);
  const glow = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, light.radius);
  glow.addColorStop(0, `rgba(255, 190, 95, ${light.strength})`);
  glow.addColorStop(1, "rgba(255, 160, 65, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
  if (shadows) {
    ctx.globalCompositeOperation = "destination-out";
    for (const caster of casters) castShadow(ctx, caster, light);
  }
  return canvas;
}
