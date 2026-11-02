import { ATLAS_LAYOUT } from './atlas-layout.ts';
import { loadArt } from './art-loader';

export const gatheredArt = loadArt('gathered', ...ATLAS_LAYOUT.gathered);
