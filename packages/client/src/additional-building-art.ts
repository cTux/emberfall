import { loadBuildingArt } from './load-building-art.ts';

export const additionalBuildingArt: Record<string, HTMLImageElement> = {
  storehouse: loadBuildingArt('building-storehouse'),
  lodge: loadBuildingArt('building-lodge'),
};
