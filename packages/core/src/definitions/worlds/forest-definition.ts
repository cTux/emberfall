import { game } from '../../game.ts';
import type { Widen } from '../../content/contracts.ts';

export const FOREST_DEFINITION = game.registries.worlds.require('forest').value as Widen<
  typeof import('../../mods/base/worlds/forest.ts').FOREST_DEFINITION
>;
