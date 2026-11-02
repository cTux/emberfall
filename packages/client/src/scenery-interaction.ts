import type { InteractionTarget } from './interaction-target.ts';
import { INTERACTION_GEOMETRY } from './interaction-geometry.ts';
import type { Scenery } from './village';

// Existing interaction geometry aligns door/wardrobe reach with their visible entry points.
import {
  GATHER_RANGE,
  BUILDINGS,
  BULLSEYE,
  ANVIL,
  INNKEEPER,
  INTERACTION_RADIUS,
} from '@emberfall/core';

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
  const anvil = !!ANVIL && object.id === `workstation:${ANVIL.id}`;

  if (
    !building &&
    !bullseye &&
    !anvil &&
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
        : anvil
          ? ANVIL!.name
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
