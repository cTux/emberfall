import { game } from '../../game.ts';
import type { Widen } from '../../content/contracts.ts';
export const FOREST_ENCOUNTER = game.registries.encounters.require('forest').value as Widen<
  typeof import('../../mods/base/encounters/forest.ts').FOREST_ENCOUNTER
>;
