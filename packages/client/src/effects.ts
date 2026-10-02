import { nearbyInteraction } from "@emberfall/common";
import type { WorldState } from "@emberfall/common";

export function drawVegetation(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  waving: boolean,
) {
  if (waving) {
    const phase = x * 0.013 + y * 0.017;
    const sway =
      (Math.sin(now / 1600 + phase) + Math.sin(now / 2700 + phase * 1.7) * 0.3) *
      (width / height) *
      (sprite.width === 16 ? 0.07 : 0.018);
    ctx.save();
    // Shear around the base: roots stay fixed while foliage catches the breeze.
    ctx.transform(1, 0, sway, 1, -sway * y, 0);
    ctx.drawImage(sprite, x - width / 2, y - height, width, height);
    ctx.restore();
  } else ctx.drawImage(sprite, x - width / 2, y - height, width, height);
}

export function treeOpacity(
  tree: { x: number; y: number; width: number; height: number },
  player: { x: number; y: number } | undefined,
) {
  return player &&
    player.y + 15 < tree.y &&
    Math.abs(player.x - tree.x) < tree.width / 2 + 24 &&
    player.y + 18 > tree.y - tree.height
    ? 0.15
    : 1;
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  ctx.save();
  ctx.fillStyle = "#eed389";
  for (let row = Math.floor((y - 40) / 160); row <= Math.ceil((y + height + 40) / 160); row++)
    for (let col = Math.floor((x - 40) / 160); col <= Math.ceil((x + width + 40) / 160); col++) {
      const seed = (((col % 30) + 30) % 30) * 179 + (((row % 16) + 16) % 16) * 83;
      ctx.globalAlpha = 0.25 + Math.sin(now / 900 + seed) * 0.2;
      ctx.fillRect(
        col * 160 + (seed % 135) + Math.sin(now / 2400 + seed) * 18,
        row * 160 + (seed % 111) + Math.cos(now / 1900 + seed) * 25,
        2,
        2,
      );
    }
  ctx.restore();
}
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const radius = Math.max(width, height) * 0.65;
  const gradient = ctx.createRadialGradient(
    x + width / 2,
    y + height / 2,
    radius * 0.25,
    x + width / 2,
    y + height / 2,
    radius,
  );
  gradient.addColorStop(0, "#08131000");
  gradient.addColorStop(1, "#081310aa");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}
export function hitOutline(mask: HTMLCanvasElement) {
  const outline = document.createElement("canvas");
  outline.width = outline.height = 20;
  const c = outline.getContext("2d")!;
  for (const [x, y] of [
    [0, 2],
    [4, 2],
    [2, 0],
    [2, 4],
    [1, 1],
    [3, 3],
    [1, 3],
    [3, 1],
  ])
    c.drawImage(mask, x, y, 16, 16);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = "#ff3737";
  c.fillRect(0, 0, 20, 20);
  c.globalCompositeOperation = "destination-out";
  c.drawImage(mask, 2, 2, 16, 16);
  return outline;
}
export function drawDamageFlash(
  ctx: CanvasRenderingContext2D,
  world: WorldState | null,
  id: string,
) {
  const hit = world?.scene?.damage.filter((d) => d.target === id).at(-1);
  const age = (world?.serverNow ?? 0) - (hit?.at ?? -10000);
  if (age < 0 || age > 280) return;
  ctx.save();
  ctx.resetTransform();
  ctx.fillStyle = `rgba(255,25,35,${0.22 * (1 - age / 280)})`;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
export type Interaction = NonNullable<ReturnType<typeof nearbyInteraction>>;
export function drawNameBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  active: boolean,
) {
  ctx.save();
  ctx.font = '9px "Pixelify Sans", sans-serif';
  ctx.textAlign = "center";
  const label = active ? `(E) ${name}` : name;
  const width = ctx.measureText(label).width + 12;
  ctx.fillStyle = active ? "#786747" : "#302d20";
  ctx.fillRect(x - width / 2, y - 20, width, 13);
  ctx.fillStyle = "#e0c995";
  ctx.fillText(label, x, y - 10);
  ctx.restore();
}

export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  settings: { colorGrading: boolean; lightShafts: boolean },
) {
  ctx.save();
  if (settings.colorGrading) {
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "#bea26f25";
    ctx.fillRect(x, y, width, height);
  }
  if (settings.lightShafts) {
    ctx.globalCompositeOperation = "screen";
    for (let col = Math.floor((x - height) / 420); col < (x + width) / 420; col++) {
      const base = col * 420 + Math.sin(now / 12000 + col) * 12;
      const gradient = ctx.createLinearGradient(base, y, base + height * 0.6, y + height);
      gradient.addColorStop(0, "#ffe6a818");
      gradient.addColorStop(1, "#ffe6a800");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(base, y);
      ctx.lineTo(base + 45, y);
      ctx.lineTo(base + height * 0.6 + 100, y + height);
      ctx.lineTo(base + height * 0.6, y + height);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawPlayerHealth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  max: number,
  name: string,
  color = "#ffffff",
  boss = false,
) {
  ctx.save();
  ctx.font = '8px "Pixelify Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const metrics = ctx.measureText(name);
  const width = Math.max(boss ? 64 : 40, Math.ceil(metrics.width) + 12);
  const height = boss ? 9 : 7;
  ctx.fillStyle = "#101817";
  ctx.fillRect(x - width / 2, y, width, height);
  ctx.fillStyle = boss ? "#c084fc" : "#86d9a2";
  ctx.fillRect(
    x - width / 2 + 1,
    y + 1,
    (width - 2) * Math.max(0, Math.min(1, hp / Math.max(1, max))),
    height - 2,
  );
  ctx.strokeStyle = "#101817";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  const nameY = y + height + metrics.actualBoundingBoxAscent;
  ctx.strokeText(name, x, nameY);
  ctx.fillStyle = color;
  ctx.fillText(name, x, nameY);
  ctx.restore();
  return width;
}
