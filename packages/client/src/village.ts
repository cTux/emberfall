import { VILLAGE_ATLAS, LODGE_CHIMNEY } from './village-art-layout.ts';
import { BUILDING_SOURCE_SIZES } from '../asset-render-sizes.ts';

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

export const workstationArt = loadArt(
  'workstations',
  VILLAGE_ATLAS.workstationColumns,
  VILLAGE_ATLAS.workstationRows,
  VILLAGE_ATLAS.environmentCell,
  true,
);

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

    if (!frames) {
      sprites.set(source, (frames = new Map()));
    }

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
    TREES.forEach((t, i) => {
      return add(
        `tree:${i}`,
        t.x,
        t.y - VILLAGE_ATLAS.treeOffsetY,
        t.size,
        t.size,
        environmentArt,
        (i % 2) * VILLAGE_ATLAS.environmentCell,
        VILLAGE_ATLAS.environmentCell,
        VILLAGE_ATLAS.environmentCell,
        VILLAGE_ATLAS.environmentCell,
      );
    });
    ROCKS.forEach((rock, i) => {
      return objects.push(
        resourceScenery({ ...rock, id: `rock:${i}`, kind: i % 2 ? 'stone' : 'rock' }),
      );
    });
  }

  if (plantArt.naturalWidth) {
    PLANTS.forEach((plant, i) => {
      return add(
        `plant:${i}`,
        plant.x,
        plant.y,
        plant.size,
        plant.size,
        plantArt,
        plant.variant * VILLAGE_ATLAS.plantCell,
        0,
        VILLAGE_ATLAS.plantCell,
        VILLAGE_ATLAS.plantCell,
      );
    });
  }

  if (buildingArt.complete && buildingArt.naturalWidth) {
    BUILDINGS.forEach((b, i) => {
      const additional = additionalBuildingArt[b.id];
      const image = additional ?? buildingArt;

      if (!image.complete || !image.naturalWidth) {
        return;
      }

      const frame = additional
        ? {
            x: 0,
            y: 0,
            ...BUILDING_SOURCE_SIZES[b.id === 'lodge' ? 'building-lodge' : 'building-storehouse'],
          }
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
        objects.at(-1)!.chimney = {
          x: LODGE_CHIMNEY.x * scale - width / 2,
          y: LODGE_CHIMNEY.y * scale - height,
        };
      }
    });
  }

  if (workstationArt.naturalWidth) {
    for (const station of VILLAGE_DEFINITION.workstations) {
      add(
        `workstation:${station.id}`,
        station.x,
        station.y,
        VILLAGE_ATLAS.workstationSize,
        VILLAGE_ATLAS.workstationSize,
        workstationArt,
        (station.art % VILLAGE_ATLAS.workstationColumns) * VILLAGE_ATLAS.environmentCell,
        Math.floor(station.art / VILLAGE_ATLAS.workstationColumns) * VILLAGE_ATLAS.environmentCell,
        VILLAGE_ATLAS.environmentCell,
        VILLAGE_ATLAS.environmentCell,
      );
    }
  }

  if (wardrobeArt.naturalWidth) {
    add(
      'building:wardrobe',
      WARDROBE.x,
      WARDROBE.y,
      VILLAGE_ATLAS.wardrobeWidth,
      VILLAGE_ATLAS.wardrobeHeight,
      wardrobeArt,
      0,
      0,
      VILLAGE_ATLAS.environmentCell,
      VILLAGE_ATLAS.environmentCell,
    );
  }

  if (environmentArt.naturalWidth) {
    TORCHES.forEach((t, i) => {
      return add(
        `torch:${i}`,
        t.x,
        t.y,
        VILLAGE_ATLAS.torchWidth,
        VILLAGE_ATLAS.torchHeight,
        environmentArt,
        0,
        VILLAGE_ATLAS.torchSourceY,
        VILLAGE_ATLAS.environmentCell,
        VILLAGE_ATLAS.environmentCell,
      );
    });
  }

  return objects.sort((a, b) => {
    return a.y - b.y;
  });
}

// Retain the existing warm, local torch pool rather than changing village visibility.
export const TORCH_LIGHTS: Light[] = TORCHES.map((t, i) => {
  return {
    ...t,
    height: 85,
    radius: 145,
    strength: 0.24,
    owner: `torch:${i}`,
  };
});

export { drawTorchFire } from './torch-rendering';
export { lightTexture } from './light-texture';
