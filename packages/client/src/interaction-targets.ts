import { BUILDINGS, INTERACTION_RADIUS, forestDistance } from '@emberfall/core';
import type { Player } from '@emberfall/common';
import { hitOutline } from './effects';
import type { Interaction } from './effects';
import type { Scenery } from './village';

export interface InteractionTarget {
  source: Interaction;
  x: number;
  y: number;
  width: number;
  height: number;
  mask: HTMLCanvasElement;
  reach: { x: number; y: number };
  radius: number;
}

export function sceneryInteraction(object: Scenery): InteractionTarget | null {
  const id = object.id.replace(/^(building|npc):/, '');
  const building = BUILDINGS.find((b) => b.id === id && b.id !== 'inn');
  if (!building && object.id !== 'building:wardrobe' && object.id !== 'npc:innkeeper') return null;
  return {
    source: { id, name: object.name!, x: object.x, y: object.y },
    x: object.x - object.width / 2,
    y: object.y - object.height,
    width: object.width,
    height: object.height,
    mask: object.mask as HTMLCanvasElement,
    reach: building ? { x: building.doorX, y: building.y + 24 } : object,
    radius: id === 'wardrobe' ? 55 : INTERACTION_RADIUS,
  };
}

export function interactionInRange(target: InteractionTarget, player: Player | undefined) {
  return (
    !!player &&
    player.hitpoints > 0 &&
    forestDistance(
      { x: player.x, y: player.y + (player.scene === 'forest' ? 0 : 15) },
      target.reach,
    ) < target.radius
  );
}

const pixels = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();
/** Match the displayed sprite's opaque pixels, frontmost functional object first. */
export function pickInteraction(
  targets: readonly InteractionTarget[],
  point: { x: number; y: number } | undefined,
) {
  if (!point) return null;
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    const x = Math.floor(((point.x - target.x) * target.mask.width) / target.width);
    const y = Math.floor(((point.y - target.y) * target.mask.height) / target.height);
    if (x < 0 || y < 0 || x >= target.mask.width || y >= target.mask.height) continue;
    let data = pixels.get(target.mask);
    if (!data) {
      data = target.mask
        .getContext('2d')!
        .getImageData(0, 0, target.mask.width, target.mask.height).data;
      pixels.set(target.mask, data);
    }
    if (data[(y * target.mask.width + x) * 4 + 3] > 0) return target;
  }
  return null;
}

const outlines = new WeakMap<HTMLCanvasElement, Map<number, HTMLCanvasElement>>();
export function drawInteractionOutline(
  ctx: CanvasRenderingContext2D,
  target: InteractionTarget,
  inRange: boolean,
) {
  // Bake at display size so wide houses and narrow NPCs have the same thickness.
  const radius = inRange ? 3 : 1;
  const width = Math.round(target.width),
    height = Math.round(target.height);
  const key = width * 10000 + height * 10 + radius;
  let cache = outlines.get(target.mask);
  if (!cache) outlines.set(target.mask, (cache = new Map()));
  let outline = cache.get(key);
  if (!outline) {
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    mask.getContext('2d')!.drawImage(target.mask, 0, 0, width, height);
    outline = hitOutline(mask, '#ffdf00', radius);
    cache.set(key, outline);
  }
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(outline, target.x - radius, target.y - radius);
  ctx.restore();
}
