import type { DrawingContext } from './rendering/drawing-context';
import {
  GATHER_RANGE,
  BULLSEYE,
  BUILDINGS,
  INNKEEPER,
  INTERACTION_RADIUS,
  forestDistance,
} from '@emberfall/core';
import type { Player } from '@emberfall/common';
import { hitOutline } from './effects.ts';
import type { Interaction } from './effects';
import type { Scenery } from './village';

// Existing interaction geometry aligns door/wardrobe reach with their visible entry points.
const INTERACTION_GEOMETRY = {
  doorOffset: 24,
  wardrobeRadius: 55,
  feetOffset: 15,
  rgbaChannels: 4,
  alphaChannel: 3,
} as const;

export interface InteractionTarget {
  source: Interaction;
  x: number;
  y: number;
  width: number;
  height: number;
  mask: HTMLCanvasElement;
  reach: { x: number; y: number };
  radius: number;
  highlighted?: boolean;
}

export function sceneryInteraction(object: Scenery): InteractionTarget | null {
  if (/^(tree|forest|plant|rock):/.test(object.id)) {
    if (object.gathered) {
      return null;
    }

    return {
      source: {
        id: `gather:${object.id}`,
        name: `Gather ${object.kind ?? 'tree'}`,
        x: object.x,
        y: object.y,
      },
      x: object.x - object.width / 2,
      y: object.y - object.height,
      width: object.width,
      height: object.height,
      mask: object.mask as HTMLCanvasElement,
      reach: object,
      radius: GATHER_RANGE,
    };
  }

  const id = object.id.replace(/^(building|npc|workstation):/, '');
  const building = BUILDINGS.find((b) => {
    return b.id === id && b.id !== 'inn';
  });
  const bullseye = !!BULLSEYE && object.id === `workstation:${BULLSEYE.id}`;

  if (
    !building &&
    !bullseye &&
    object.id !== 'building:wardrobe' &&
    object.id !== 'npc:innkeeper' &&
    object.id !== 'npc:craftsman'
  ) {
    return null;
  }

  return {
    source: {
      id,
      name: building
        ? building.name
        : bullseye
          ? 'Bullseye'
          : id === 'wardrobe'
            ? 'Wardrobe'
            : (object.npc?.name ?? INNKEEPER.name),
      x: object.x,
      y: object.y,
    },
    x: object.x - object.width / 2,
    y: object.y - object.height,
    width: object.width,
    height: object.height,
    mask: object.mask as HTMLCanvasElement,
    reach: building
      ? { x: building.doorX, y: building.y + INTERACTION_GEOMETRY.doorOffset }
      : object,
    radius: id === 'wardrobe' ? INTERACTION_GEOMETRY.wardrobeRadius : INTERACTION_RADIUS,
  };
}

export function interactionInRange(target: InteractionTarget, player: Player | undefined) {
  return (
    !!player &&
    player.hitpoints > 0 &&
    forestDistance(
      {
        x: player.x,
        y:
          player.y +
          (target.source.id.startsWith('gather:') || player.scene !== 'forest'
            ? INTERACTION_GEOMETRY.feetOffset
            : 0),
      },
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
  if (!point) {
    return null;
  }

  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    const x = Math.floor(((point.x - target.x) * target.mask.width) / target.width);
    const y = Math.floor(((point.y - target.y) * target.mask.height) / target.height);

    if (x < 0 || y < 0 || x >= target.mask.width || y >= target.mask.height) {
      continue;
    }

    let data = pixels.get(target.mask);

    if (!data) {
      data = target.mask
        .getContext('2d')!
        .getImageData(0, 0, target.mask.width, target.mask.height).data;
      pixels.set(target.mask, data);
    }

    if (
      data[
        (y * target.mask.width + x) * INTERACTION_GEOMETRY.rgbaChannels +
          INTERACTION_GEOMETRY.alphaChannel
      ] > 0
    ) {
      return target;
    }
  }

  return null;
}

const outlines = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
export function drawInteractionOutline(ctx: DrawingContext, target: InteractionTarget) {
  // Bake at display size so wide houses and narrow NPCs have the same thickness.
  const radius = 1;
  const width = Math.round(target.width),
    height = Math.round(target.height);
  const color = target.highlighted ? '#00ff00' : '#ffdf00';
  const key = `${width}:${height}:${color}`;
  let cache = outlines.get(target.mask);

  if (!cache) {
    outlines.set(target.mask, (cache = new Map()));
  }

  let outline = cache.get(key);

  if (!outline) {
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    mask.getContext('2d')!.drawImage(target.mask, 0, 0, width, height);
    outline = hitOutline(mask, color, radius);
    cache.set(key, outline);
  }

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(outline, target.x - radius, target.y - radius);
  ctx.restore();
}

export function partyInteraction(
  world: import('@emberfall/common').WorldState | null | undefined,
  player: Player | undefined,
): Interaction | null {
  if (!world || !player || player.hitpoints <= 0 || player.reconnecting) {
    return null;
  }

  const candidates = world.players.filter((p) => {
    return (
      p.id !== player.id &&
      p.scene === player.scene &&
      (!p.scene || p.runId === player.runId) &&
      p.hitpoints > 0 &&
      !p.reconnecting &&
      forestDistance(player, p) < INTERACTION_RADIUS
    );
  });
  candidates.sort((a, b) => {
    return forestDistance(player, a) - forestDistance(player, b);
  });

  for (const target of candidates) {
    const name = partyAction(world, player, target);

    if (name) {
      return { id: `party:${target.id}`, name, x: target.x, y: target.y };
    }
  }

  return null;
}

export function partyAction(
  world: import('@emberfall/common').WorldState | null | undefined,
  player: Player | undefined,
  target: Player,
) {
  if (
    !world ||
    !player ||
    player.hitpoints <= 0 ||
    player.reconnecting ||
    target.id === player.id ||
    target.scene !== player.scene ||
    (target.scene && target.runId !== player.runId) ||
    target.hitpoints <= 0 ||
    target.reconnecting
  ) {
    return null;
  }

  return world.partyRequests?.some((r) => {
    return r.fromId === target.id;
  })
    ? 'Accept'
    : !player.partyId && target.partyId
      ? 'Join party'
      : !target.partyId && (!player.partyId || player.partyLeaderId === player.id)
        ? 'Invite to party'
        : null;
}
