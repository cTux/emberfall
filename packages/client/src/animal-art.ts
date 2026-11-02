import { ATLAS_LAYOUT } from './atlas-layout.ts';
import { loadArt } from './art-loader';

export const animalArt = loadArt('animals', ...ATLAS_LAYOUT.animals, true);
