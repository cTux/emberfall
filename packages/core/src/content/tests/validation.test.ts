import assert from 'node:assert/strict';
import test from 'node:test';
import { game } from '../../game.ts';
import type { Registries } from '../contracts.ts';
import { createValidationContext } from '../validation/context.ts';
import { validateStructure } from '../validation/structure.ts';

test('data-family validation rejects unknown IDs and malformed values with mod ownership', () => {
  const families = {
    worlds: 'village',
    encounters: 'forest',
    settings: 'runtime',
    pickups: 'experience',
    effects: 'damage',
  } as const;

  for (const group of Object.keys(families) as (keyof typeof families)[]) {
    for (const id of ['fixture:unknown', families[group]]) {
      const registries: Registries = {
        ...game.registries,
        [group]: {
          ...game.registries[group],
          values: () => {
            return [{ id, value: null }];
          },
        },
      };
      assert.throws(
        () => {
          return validateStructure(
            createValidationContext(registries, () => {
              return 'fixture';
            }),
          );
        },
        (error: unknown) => {
          return error instanceof Error && error.message.includes(`Mod 'fixture' ${group} '${id}'`);
        },
        `${group}: ${id}`,
      );
    }
  }
});
