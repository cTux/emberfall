import type { SceneState } from '@emberfall/common';

// Forest is the baseline; future combat zones set their own rarity factor here.
export const zoneRarityMultiplier: Readonly<Record<SceneState['type'], number>> = Object.freeze({
  Forest: 1,
});
