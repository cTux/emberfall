import { nearbyInteraction } from '@emberfall/core';
import type { WorldState } from '@emberfall/common';
import { drawWorldBar } from './world-bar.ts';

export function drawChatBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text?: string) {
  if (!text) return;
  ctx.save();
  ctx.font = '10px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = [''];
  for (const word of text.trim().split(/\s+/u)) {
    const line = lines.at(-1)!;
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > 200) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 16;
  const height = lines.length * 13 + 10;
  const bottom = y - 52; // Two units above the player health bar; overlays the debuff area.
  const left = x - width / 2;
  const right = x + width / 2;
  const top = bottom - height;
  ctx.fillStyle = '#15211eee';
  ctx.strokeStyle = '#b9c9b65c';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#00000055';
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
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.fillStyle = '#f4ecd6';
  lines.forEach((line, i) => ctx.fillText(line, x, top + 11.5 + i * 13));
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

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  ctx.save();
  ctx.fillStyle = '#eed389';
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
  gradient.addColorStop(0, '#08131000');
  gradient.addColorStop(1, '#081310aa');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}
export function hitOutline(mask: HTMLCanvasElement, color = '#ff3737', radius = 2) {
  const outline = document.createElement('canvas');
  outline.width = mask.width + radius * 2;
  outline.height = mask.height + radius * 2;
  const c = outline.getContext('2d')!;
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
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, outline.width, outline.height);
  c.globalCompositeOperation = 'destination-out';
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
    const tint = document.createElement('canvas');
    tint.width = mask.width;
    tint.height = mask.height;
    const c = tint.getContext('2d')!;
    c.drawImage(mask, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#ffffff';
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
  ctx.globalAlpha *= 0.22 * (1 - age / 280);
  ctx.fillStyle = '#ff1923';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
export type Interaction = NonNullable<ReturnType<typeof nearbyInteraction>> & {
  activate?: () => void;
};

export function drawInteractionPrompt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
) {
  ctx.save();
  ctx.font = '9px "Alegreya Sans", sans-serif';
  ctx.textBaseline = 'middle';
  const width = 24 + ctx.measureText(label).width;
  const left = x - width / 2;
  const centerY = y - 23;
  const keyX = left + 8;
  const surface = ctx.createLinearGradient(0, centerY - 8, 0, centerY + 8);
  surface.addColorStop(0, '#303126');
  surface.addColorStop(1, '#171c17');
  const bronze = ctx.createLinearGradient(0, centerY - 8, 0, centerY + 8);
  bronze.addColorStop(0, '#f2d6a0');
  bronze.addColorStop(0.5, '#b48c57');
  bronze.addColorStop(1, '#725332');
  ctx.beginPath();
  ctx.arc(keyX, centerY, 8, Math.PI / 2, Math.PI * 1.5);
  ctx.arc(left + width - 8, centerY, 8, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fillStyle = surface;
  ctx.shadowColor = '#00000080';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = bronze;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Concentric rings keep the rim and capsule inset equal on every side.
  ctx.beginPath();
  ctx.arc(keyX, centerY, 6, 0, Math.PI * 2);
  ctx.fillStyle = bronze;
  ctx.shadowColor = '#000000b0';
  ctx.shadowOffsetY = 1.5;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const face = ctx.createLinearGradient(keyX - 4, centerY - 4, keyX + 4, centerY + 4);
  face.addColorStop(0, '#8a7c55');
  face.addColorStop(0.45, '#49432c');
  face.addColorStop(1, '#29291e');
  ctx.beginPath();
  ctx.arc(keyX, centerY, 5, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = '#292418';
  ctx.lineWidth = 0.4;
  ctx.stroke();
  ctx.fillStyle = '#f4ecd6';
  ctx.textAlign = 'center';
  ctx.fillText('E', keyX, centerY);
  ctx.textAlign = 'left';
  ctx.fillText(label, left + 18, centerY);
  ctx.restore();
}

export function drawCharacterName(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  color = '#ffffff',
) {
  ctx.save();
  ctx.font = '8px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const label = name;
  const metrics = ctx.measureText(label);
  ctx.strokeStyle = '#101817';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeText(label, x, y + metrics.actualBoundingBoxAscent);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y + metrics.actualBoundingBoxAscent);
  ctx.restore();
}

export function drawNameBadge(ctx: CanvasRenderingContext2D, x: number, y: number, name: string) {
  ctx.save();
  ctx.font = '9px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  const label = name;
  const width = ctx.measureText(label).width + 12;
  ctx.fillStyle = '#302d20';
  ctx.fillRect(x - width / 2, y - 20, width, 13);
  ctx.fillStyle = '#e0c995';
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
  daylight = 1,
) {
  ctx.save();
  if (settings.colorGrading) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = '#bea26f25';
    ctx.fillRect(x, y, width, height);
  }
  if (settings.lightShafts) {
    ctx.globalAlpha *= daylight;
    ctx.globalCompositeOperation = 'screen';
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
      gradient.addColorStop(0, '#ffe6a800');
      gradient.addColorStop(0.2, '#ffe6a803');
      gradient.addColorStop(0.5, '#ffe6a80c');
      gradient.addColorStop(0.8, '#ffe6a803');
      gradient.addColorStop(1, '#ffe6a800');
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
  color = '#ffffff',
  boss = false,
  showHealth = true,
) {
  ctx.save();
  ctx.font = '8px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(name);
  const width = Math.max(boss ? 64 : 40, Math.ceil(metrics.width) + 12);
  const bottom = y + (boss ? 9 : 7);
  // Grow upward to preserve the existing name and sprite clearance.
  if (showHealth)
    drawWorldBar(
      ctx,
      x - width / 2,
      bottom,
      width,
      hp / Math.max(1, max),
      boss ? '#c084fc' : '#86d9a2',
    );
  drawCharacterName(ctx, x, bottom, name, color);
  ctx.restore();
  return width;
}

const partyOutlines = new WeakMap<HTMLCanvasElement, Map<boolean, HTMLCanvasElement>>();
export function drawPartyOutline(
  ctx: CanvasRenderingContext2D,
  mask: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  highlighted = false,
) {
  let cache = partyOutlines.get(mask);
  if (!cache) partyOutlines.set(mask, (cache = new Map()));
  let outline = cache.get(highlighted);
  if (!outline) {
    const silhouette = document.createElement('canvas');
    silhouette.width = 48;
    silhouette.height = 48;
    silhouette.getContext('2d')!.drawImage(mask, 0, 0, 48, 48);
    outline = hitOutline(silhouette, highlighted ? '#00ff00' : '#339dff', 1);
    cache.set(highlighted, outline);
  }
  ctx.drawImage(outline, x - width / 48, y - height / 48, (width * 50) / 48, (height * 50) / 48);
}
