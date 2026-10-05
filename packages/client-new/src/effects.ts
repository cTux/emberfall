import { nearbyInteraction } from "@emberfall/common-new";
import type { WorldState } from "@emberfall/common-new";

export function drawChatBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text?: string) {
  if (!text) return;
  ctx.save();
  ctx.font = '13px "Alegreya Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = [""];
  for (const character of text) {
    if (ctx.measureText(lines.at(-1)! + character).width > 200) lines.push("");
    lines[lines.length - 1] += character;
  }
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 20;
  const height = lines.length * 17 + 14;
  const bottom = y - 48; // Two units above the player health bar; overlays the debuff area.
  const left = x - width / 2;
  const right = x + width / 2;
  const top = bottom - height;
  ctx.fillStyle = "#15211eee";
  ctx.strokeStyle = "#b9c9b65c";
  ctx.lineWidth = 1;
  ctx.shadowColor = "#00000055";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.moveTo(left + 8, top);
  ctx.lineTo(right - 8, top);
  ctx.quadraticCurveTo(right, top, right, top + 8);
  ctx.lineTo(right, bottom - 8);
  ctx.quadraticCurveTo(right, bottom, right - 8, bottom);
  ctx.lineTo(left + 8, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - 8);
  ctx.lineTo(left, top + 8);
  ctx.quadraticCurveTo(left, top, left + 8, top);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();
  ctx.fillStyle = "#f4ecd6";
  lines.forEach((line, i) => ctx.fillText(line, x, top + 15.5 + i * 17));
  ctx.restore();
}

export function vegetationSway(
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  grass = false,
) {
  const phase = x * 0.013 + y * 0.017;
  return (
    (Math.sin(now / 1600 + phase) + Math.sin(now / 2700 + phase * 1.7) * 0.3) *
    (width / height) *
    (grass ? 0.07 : 0.018)
  );
}

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
    const sway = vegetationSway(x, y, width, height, now, sprite.width === 16);
    ctx.save();
    // Shear around the base: roots stay fixed while foliage catches the breeze.
    ctx.transform(1, 0, sway, 1, -sway * y, 0);
    ctx.drawImage(sprite, x - width / 2, y - height, width, height);
    ctx.restore();
  } else ctx.drawImage(sprite, x - width / 2, y - height, width, height);
}

export function obstacleOpacity(
  object: { x: number; y: number; width: number; height: number },
  player: { x: number; y: number } | undefined,
) {
  return player &&
    player.y + 15 < object.y &&
    Math.abs(player.x - object.x) < object.width / 2 + 24 &&
    player.y + 18 > object.y - object.height
    ? 0.2
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
export function hitOutline(mask: HTMLCanvasElement, color = "#ff3737", radius = 2) {
  const outline = document.createElement("canvas");
  outline.width = mask.width + radius * 2;
  outline.height = mask.height + radius * 2;
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
    c.drawImage(mask, (x * radius) / 2, (y * radius) / 2);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = color;
  c.fillRect(0, 0, outline.width, outline.height);
  c.globalCompositeOperation = "destination-out";
  c.drawImage(mask, radius, radius);
  return outline;
}
const hitSprites = new WeakMap<
  HTMLCanvasElement,
  { outline: HTMLCanvasElement; tint: HTMLCanvasElement }
>();
export function drawTargetHit(
  ctx: CanvasRenderingContext2D,
  mask: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  age: number,
) {
  if (age < 0 || age >= 220) return;
  let sprites = hitSprites.get(mask);
  if (!sprites) {
    const tint = document.createElement("canvas");
    tint.width = mask.width;
    tint.height = mask.height;
    const c = tint.getContext("2d")!;
    c.drawImage(mask, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, tint.width, tint.height);
    sprites = { outline: hitOutline(mask), tint };
    hitSprites.set(mask, sprites);
  }
  const padX = (2 * width) / mask.width;
  const padY = (2 * height) / mask.height;
  ctx.save();
  ctx.globalAlpha *= 1 - age / 220;
  ctx.drawImage(sprites.outline, x - padX, y - padY, width + padX * 2, height + padY * 2);
  ctx.drawImage(sprites.tint, x, y, width, height);
  ctx.restore();
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
  ctx.font = '9px "Alegreya Sans", sans-serif';
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
    const slope = 0.6;
    const beamWidth = 160;
    // Anchor parallel beams to the world, rather than restarting at the viewport top.
    const first = Math.floor((x - slope * (y + height) - beamWidth - 12) / 420);
    const last = Math.ceil((x + width - slope * y + 12) / 420);
    for (let col = first; col <= last; col++) {
      const base = col * 420 + Math.sin(now / 12000 + col) * 12 + slope * y;
      // Fade across the beam's perpendicular axis so both long edges are transparent.
      const cross = beamWidth / (1 + slope * slope);
      const gradient = ctx.createLinearGradient(base, y, base + cross, y - slope * cross);
      gradient.addColorStop(0, "#ffe6a800");
      gradient.addColorStop(0.2, "#ffe6a803");
      gradient.addColorStop(0.5, "#ffe6a80c");
      gradient.addColorStop(0.8, "#ffe6a803");
      gradient.addColorStop(1, "#ffe6a800");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(base, y);
      ctx.lineTo(base + beamWidth, y);
      ctx.lineTo(base + height * slope + beamWidth, y + height);
      ctx.lineTo(base + height * slope, y + height);
      ctx.closePath();
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
  ctx.font = '8px "Alegreya Sans", sans-serif';
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
