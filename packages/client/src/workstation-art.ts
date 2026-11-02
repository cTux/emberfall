import { loadArt } from './art';
import { VILLAGE_ATLAS } from './village-art-layout.ts';

export const workstationArt = loadArt(
  'workstations',
  VILLAGE_ATLAS.workstationColumns,
  VILLAGE_ATLAS.workstationRows,
  VILLAGE_ATLAS.environmentCell,
  true,
);
