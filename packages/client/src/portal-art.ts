import { AMBIENT } from './ambient.ts';
import { loadArt } from './art';

// The reusable 32-pixel radial texture is the existing balance between soft puffs and small upload size.

export const portalArt = loadArt('portal-stone', 1, 1, AMBIENT.portalCell, true);
