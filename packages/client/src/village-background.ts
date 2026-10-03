import { ARENA } from "@emberfall/common";
import type { GraphicsSettings } from "./graphics";
import { drawVillagePaths } from "./paths";
import { castShadow } from "./lighting";
import { villageSprites, TORCH_LIGHTS, lightTexture } from "./village";

const nature = new Image();
nature.src = "/assets/nature.png";
const floor = new Image();
floor.src = "/assets/floor.png";
const houses = new Image();
houses.src = "/assets/houses.png";
const wardrobe = new Image();
wardrobe.src = "/assets/wardrobe.png";
const lampPost = new Image();
lampPost.src = "/assets/lanterns/lamp-post.png";
const lantern = new Image();
lantern.src = "/assets/lanterns/lantern.png";
export const villageImages = { nature, floor, houses, wardrobe, lampPost, lantern };
let cached:
  | {
      key: string;
      background: HTMLCanvasElement;
      scenery: ReturnType<typeof villageSprites>;
      torchTextures: HTMLCanvasElement[];
    }
  | undefined;

/** Shared across Arena remounts. Wait for all assets, including failed loads. */
export function villageBackground(graphics: GraphicsSettings) {
  if (Object.values(villageImages).some((image) => !image.complete)) return undefined;
  const key = `${graphics.grass}:${graphics.shadows}:${graphics.ambientOcclusion}`;
  if (cached?.key === key) return cached;
  const background = cached?.background ?? document.createElement("canvas");
  if (background.width !== ARENA.width) {
    background.width = ARENA.width;
    background.height = ARENA.height;
  }
  const ctx = background.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#25392f";
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  // A fixed seed keeps the decorative clearing identical for every client.
  let seed = 7319;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 325; i++) {
    const x = random() * ARENA.width;
    const y = random() * ARENA.height;
    const radius = 35 + random() * 110;
    const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
    patch.addColorStop(0, i % 2 ? "#78905712" : "#0b231c20");
    patch.addColorStop(1, "#25392f00");
    ctx.fillStyle = patch;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 36000; i++) {
    ctx.fillStyle = random() > 0.5 ? "#80965c12" : "#142b2020";
    ctx.fillRect(random() * ARENA.width, random() * ARENA.height, 1 + random() * 3, 1);
  }
  drawVillagePaths(ctx, floor);
  const scenery = villageSprites(nature, houses, wardrobe, lampPost, lantern, graphics);
  for (const object of scenery) {
    if (graphics.shadows) castShadow(ctx, object);
    if (graphics.ambientOcclusion && !object.id.startsWith("grass")) {
      ctx.save();
      ctx.translate(object.x, object.y);
      ctx.scale(1, 0.3);
      const radius = object.width * 0.5;
      const ao = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      ao.addColorStop(0, "#07100980");
      ao.addColorStop(1, "#07100900");
      ctx.fillStyle = ao;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }
  }
  const torchTextures = TORCH_LIGHTS.map((light) => lightTexture(light, scenery, graphics.shadows));
  cached = { key, background, scenery, torchTextures };
  return cached;
}

/** Clip the source as well as the destination, including at the wrapping seams. */
export function drawVillageBackground(
  ctx: CanvasRenderingContext2D,
  background: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  for (let row = Math.floor(y / ARENA.height); row < (y + height) / ARENA.height; row++)
    for (let col = Math.floor(x / ARENA.width); col < (x + width) / ARENA.width; col++) {
      const left = Math.max(x, col * ARENA.width);
      const top = Math.max(y, row * ARENA.height);
      const w = Math.min(x + width, (col + 1) * ARENA.width) - left;
      const h = Math.min(y + height, (row + 1) * ARENA.height) - top;
      ctx.drawImage(
        background,
        left - col * ARENA.width,
        top - row * ARENA.height,
        w,
        h,
        left,
        top,
        w,
        h,
      );
    }
}
