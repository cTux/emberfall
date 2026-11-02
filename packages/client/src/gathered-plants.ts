import { PLANT_KINDS } from '@emberfall/core';

// Source art grids use 128-pixel scenery frames and 64-pixel plants; depleted stumps retain their approved 48% scale.
import { loadNativeArt } from './art';

export const gatheredPlants = PLANT_KINDS.map((id) => {
  return loadNativeArt(`gathered-${id}`);
});
