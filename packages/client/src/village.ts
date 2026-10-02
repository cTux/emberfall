import { WARDROBE, BUILDINGS, TORCHES, TREES, onPath, TRAINING_ZONES } from "@emberfall/common";
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
  graphics: GraphicsSettings,
): Scenery[] {
  const objects: Scenery[] = [];
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
    const sprite = document.createElement("canvas");
    sprite.width = sw;
    sprite.height = sh;
    sprite.getContext("2d")!.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
    objects.push({ id, x, y, width, height, sprite, mask: makeMask(sprite), name });
  }
  if (nature.naturalWidth) {
    TREES.forEach((t, i) => add(`tree:${i}`, t.x, t.y - 8, t.size, t.size, nature, 32, 0, 32, 32));
    let seed = 713;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < (graphics.grass ? 170 : 65); i++) {
      const x = random() * 960,
        y = random() * 640;
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
  const wardrobe = document.createElement("canvas");
  wardrobe.width = 32;
  wardrobe.height = 40;
  const w = wardrobe.getContext("2d")!;
  w.fillStyle = "#30241f";
  w.fillRect(1, 2, 30, 38);
  w.fillStyle = "#ad7447";
  w.fillRect(3, 5, 26, 31);
  w.fillStyle = "#68452e";
  w.fillRect(5, 7, 10, 27);
  w.fillRect(17, 7, 10, 27);
  w.fillStyle = "#e3ba72";
  w.fillRect(12, 21, 2, 3);
  w.fillRect(18, 21, 2, 3);
  w.fillStyle = "#d39b56";
  w.fillRect(0, 1, 32, 4);
  w.fillRect(0, 35, 32, 3);
  add("building:wardrobe", WARDROBE.x, WARDROBE.y, 48, 60, wardrobe, 0, 0, 32, 40, "Wardrobe");
  const torch = document.createElement("canvas");
  torch.width = 16;
  torch.height = 48;
  const ctx = torch.getContext("2d")!;
  ctx.fillStyle = "#343735";
  ctx.fillRect(2, 43, 12, 5);
  ctx.fillStyle = "#7c7157";
  ctx.fillRect(5, 12, 6, 32);
  ctx.fillStyle = "#b29b69";
  ctx.fillRect(6, 14, 2, 28);
  ctx.fillStyle = "#302e26";
  ctx.fillRect(2, 7, 12, 8);
  ctx.fillRect(1, 6, 14, 2);
  ctx.fillStyle = "#b77439";
  ctx.fillRect(4, 2, 8, 7);
  ctx.fillStyle = "#ffdb86";
  ctx.fillRect(6, 0, 4, 8);
  TORCHES.forEach((t, i) => add(`torch:${i}`, t.x, t.y, 20, 60, torch, 0, 0, 16, 48));
  return objects.sort((a, b) => a.y - b.y);
}
export const TORCH_LIGHTS: Light[] = TORCHES.map((t, i) => ({
  ...t,
  height: 85,
  radius: 145,
  strength: 0.24,
  owner: `torch:${i}`,
}));

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
