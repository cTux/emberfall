import type { VillageNpc } from '@emberfall/common';
import { WARDROBE, BUILDINGS, TORCHES, TREES, ROCKS, PLANTS } from '@emberfall/core';
import { makeMask } from './lighting';
import type { Caster, Light } from './lighting';
import {
  environmentArt,
  buildingArt,
  buildingFrames,
  additionalBuildingArt,
  plantArt,
  wardrobeArt,
  loadArt,
} from './art';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import { resourceScenery } from './gathering';

export const workstationArt = loadArt('workstations', 4, 2, 128, true);

export interface Scenery extends Caster {
  kind?: 'tree' | 'plant' | 'rock' | 'stone';
  gathered?: boolean;
  npc?: VillageNpc;
  sprite: HTMLCanvasElement;
  name?: string;
  chimney?: { x: number; y: number };
  frames?: { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }[];
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
    frameCount = 1,
  ) {
    let frames = sprites.get(source);
    if (!frames) sprites.set(source, (frames = new Map()));
    const animation = Array.from({ length: frameCount }, (_, i) => {
      const key = `${sx + i * sw}:${sy}:${sw}:${sh}`;
      let frame = frames.get(key);
      if (!frame) {
        const sprite = document.createElement('canvas');
        const resolution =
          source instanceof HTMLImageElement ? Number(source.dataset.artResolution ?? 1) : 1;
        sprite.width = sw * resolution;
        sprite.height = sh * resolution;
        sprite
          .getContext('2d')!
          .drawImage(
            source,
            (sx + i * sw) * resolution,
            sy * resolution,
            sw * resolution,
            sh * resolution,
            0,
            0,
            sprite.width,
            sprite.height,
          );
        frame = { sprite, mask: makeMask(sprite) };
        frames.set(key, frame);
      }

      return frame;
    });
    objects.push({
      id,
      x,
      y,
      width,
      height,
      ...animation[0],
      ...(frameCount > 1 ? { frames: animation } : {}),
    });
  }

  if (environmentArt.naturalWidth) {
    TREES.forEach((t, i) =>
      add(`tree:${i}`, t.x, t.y - 8, t.size, t.size, environmentArt, (i % 2) * 128, 128, 128, 128),
    );
    ROCKS.forEach((rock, i) =>
      objects.push(resourceScenery({ ...rock, id: `rock:${i}`, kind: i % 2 ? 'stone' : 'rock' })),
    );
  }

  if (plantArt.naturalWidth)
    PLANTS.forEach((plant, i) =>
      add(
        `plant:${i}`,
        plant.x,
        plant.y,
        plant.size,
        plant.size,
        plantArt,
        plant.variant * 64,
        0,
        64,
        64,
      ),
    );
  if (buildingArt.complete && buildingArt.naturalWidth)
    BUILDINGS.forEach((b, i) => {
      const additional = additionalBuildingArt[b.id];
      const image = additional ?? buildingArt;
      if (!image.complete || !image.naturalWidth) return;
      const frame = additional
        ? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }
        : buildingFrames[i];
      const width = b.sourceWidth * 2;
      const scale = width / frame.width;
      const height = frame.height * scale;
      add(
        `building:${b.id}`,
        b.x,
        b.y,
        width,
        height,
        image,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
      );
      if (!additional) {
        const chimney = buildingFrames[i];
        objects.at(-1)!.chimney = {
          x: chimney.chimneyX * scale - width / 2,
          y: chimney.chimneyY * scale - height,
        };
      } else if (b.id === 'lodge') {
        objects.at(-1)!.chimney = { x: 585 * scale - width / 2, y: 18 * scale - height };
      }
    });
  if (workstationArt.naturalWidth)
    for (const station of VILLAGE_DEFINITION.workstations)
      add(
        `workstation:${station.id}`,
        station.x,
        station.y,
        48,
        48,
        workstationArt,
        (station.art % 4) * 128,
        Math.floor(station.art / 4) * 128,
        128,
        128,
      );
  if (wardrobeArt.naturalWidth)
    add('building:wardrobe', WARDROBE.x, WARDROBE.y, 60, 64, wardrobeArt, 0, 0, 128, 128);
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

export { drawTorchFire } from './torch-rendering';
export { lightTexture } from './light-texture';
