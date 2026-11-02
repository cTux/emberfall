import { scatterScenery } from './scatter-scenery.ts';
import { TREES } from './trees-definition.ts';
import { VILLAGE_DEFINITION } from './definitions/worlds/village.ts';
import { ROCK_SCATTER } from './village-layout.ts';

export const ROCKS = scatterScenery(
  VILLAGE_DEFINITION.rockSeed ?? ROCK_SCATTER.seed,
  VILLAGE_DEFINITION.rockAttempts ?? ROCK_SCATTER.attempts,
  ROCK_SCATTER.minSize,
  ROCK_SCATTER.sizeRange,
  1,
  TREES,
);
