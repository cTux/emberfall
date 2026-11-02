import { ATLAS_LAYOUT } from './atlas-layout.ts';
import { loadArt } from './art-loader';

export const plantArt = loadArt('plants', ...ATLAS_LAYOUT.plants, true);
