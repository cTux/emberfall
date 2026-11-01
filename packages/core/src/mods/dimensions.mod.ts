import type { GameMod } from '../content/contracts.ts';
import { DIMENSIONS, DIMENSION_ITEMS } from './dimensions/definitions.ts';
import { DIMENSION_ENEMIES } from './dimensions/enemies.ts';

export const dimensionsMod: GameMod = {
  id: 'dimensions',
  register(r) {
    r.settings.register({ id: 'dimensions', value: DIMENSIONS });

    for (const [id, name] of Object.entries(DIMENSION_ITEMS)) {
      r.items.register({ id, name, kind: 'resource', price: 1 });
    }

    for (const dimension of [DIMENSIONS.swamp, DIMENSIONS.desert]) {
      for (const enemy of dimension.enemies) {
        r.spawnRules.register({
          id: `${dimension.id}:${enemy}`,
          enemy,
          chance: 1 / dimension.enemies.length,
          dimension: dimension.id,
        });
      }
    }

    for (const enemy of DIMENSION_ENEMIES) {
      r.enemies.register(enemy);
    }

    r.bosses.register({
      id: 'mireMatriarch',
      name: 'The Mire Matriarch',
      archetype: 'mossGolem',
      kind: 'boss',
    });
    r.bosses.register({
      id: 'sunstoneSovereign',
      name: 'The Sunstone Sovereign',
      archetype: 'duneColossus',
      kind: 'boss',
    });
  },
};
