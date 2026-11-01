import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, baseMod, spawnArchetype, dimensionDefinition } from '@emberfall/core';
import { dimensionsMod } from '../../core/src/mods/dimensions.mod.ts';
import { DIMENSIONS } from '../../core/src/mods/dimensions/definitions.ts';
import { tickSpawns } from '../../core/src/simulation/spawns.ts';
import { scene as combatScene, hero as combatHero } from './classes.fixture.ts';

test('dimension spawn rules never select another dimension enemy', () => {
  for (const dimension of ['swamp', 'desert'] as const) {
    const definition = dimensionDefinition(dimension);

    for (const roll of [0, 0.34, 0.67, 0.99999]) {
      assert.ok(definition.enemies.includes(spawnArchetype(roll, 1, undefined, dimension)));
    }
  }
});

test('isolated dimension catalogs spawn their own registered boss', () => {
  const context = createGame([
    baseMod,
    {
      id: 'custom-dimensions',
      register(r) {
        dimensionsMod.register({
          ...r,
          settings: {
            register(entry) {
              r.settings.register({
                ...entry,
                value: { ...DIMENSIONS, swamp: { ...DIMENSIONS.swamp, boss: 'fixture:boss' } },
              });
            },
          },
        });
        r.bosses.register({
          id: 'fixture:boss',
          name: 'Custom boss',
          archetype: 'mossGolem',
          kind: 'boss',
        });
      },
    },
  ]);
  const run = combatScene();
  run.dimension = 'swamp';
  run.endsAt = 1000;
  tickSpawns(
    run,
    [combatHero()],
    1000,
    1,
    Object.fromEntries(context.registries.enemies.entries()),
    context,
  );
  assert.equal(run.spawns![0].name, 'Custom boss');
  assert.equal(run.spawns![0].archetype, 'mossGolem');
});
