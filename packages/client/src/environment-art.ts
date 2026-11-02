import { ATLAS_LAYOUT } from './atlas-layout.ts';
import { loadArt } from './art-loader';

export const environmentArt = loadArt('environment', ...ATLAS_LAYOUT.environment, true);
