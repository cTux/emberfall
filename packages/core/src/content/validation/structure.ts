import type { ValidationContext } from './context.ts';
import type { RegistryName } from '../contracts.ts';
import {
  contentShapes,
  worldShapes,
  encounterShapes,
  settingShapes,
  pickupShapes,
  effectShapes,
} from '../shapes.ts';

import type { z } from 'zod';

type ShapeGroup = 'worlds' | 'encounters' | 'settings' | 'pickups' | 'effects';
const shapeGroups: Record<
  ShapeGroup,
  { shapes: Readonly<Record<string, z.ZodType>>; unsupported: string }
> = {
  worlds: { shapes: worldShapes, unsupported: 'unsupported playable scene family' },
  encounters: { shapes: encounterShapes, unsupported: 'unsupported encounter family' },
  settings: { shapes: settingShapes, unsupported: 'unsupported setting' },
  pickups: { shapes: pickupShapes, unsupported: 'unsupported pickup mechanic' },
  effects: { shapes: effectShapes, unsupported: 'unsupported effect mechanic' },
};

export function validateStructure(context: ValidationContext) {
  const { r, fail, check } = context;
  for (const name of Object.keys(r) as RegistryName[])
    for (const entry of r[name].values()) {
      const result = contentShapes[name].safeParse(entry);
      if (!result.success) fail(name, entry.id, result.error.message);
    }

  for (const name of Object.keys(shapeGroups) as ShapeGroup[]) {
    const { shapes, unsupported } = shapeGroups[name];
    for (const entry of r[name].values()) {
      const shape = shapes[entry.id];
      if (!shape) fail(name, entry.id, unsupported);
      const result = shape.safeParse(entry.value);
      if (!result.success) fail(name, entry.id, result.error.message);
    }
  }

  for (const entry of r.critters.values())
    check(
      ['cat', 'chicken', 'raccoon'].includes(entry.id),
      'critters',
      entry.id,
      'unsupported critter art family',
    );
  for (const id of ['experience', 'gold']) r.pickups.require(id);
  for (const id of ['damage', 'explosion', 'blood', 'hitFlash']) r.effects.require(id);
}
