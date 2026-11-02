import { scatterScenery } from './scatter-scenery.ts';
import { TREES } from './trees-definition.ts';
import { ROCKS } from './rocks.ts';
import { VILLAGE_DEFINITION } from './definitions/worlds/village.ts';
import { PLANT_SCATTER } from './village-layout.ts';
import { PLANT_KINDS } from './plants.ts';

export const PLANTS = scatterScenery(
  VILLAGE_DEFINITION.plantSeed ?? PLANT_SCATTER.seed,
  VILLAGE_DEFINITION.plantAttempts ?? PLANT_SCATTER.attempts,
  PLANT_SCATTER.minSize,
  PLANT_SCATTER.sizeRange,
  PLANT_KINDS.length,
  [...TREES, ...ROCKS],
);
