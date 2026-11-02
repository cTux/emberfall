import { ATLAS_LAYOUT } from './atlas-layout.ts';
import { loadArt } from './art-loader';

export const wardrobeArt = loadArt('wardrobe', ...ATLAS_LAYOUT.wardrobe, true);
