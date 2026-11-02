import { BUILDING_SOURCE_SIZES } from '../asset-render-sizes.ts';

// These measured grids describe the shipped source PNGs; changing them changes which pixels form each frame.
import { loadNativeArt } from './art-loader';

// Keep authored crop/chimney coordinates valid for original dev art and resized production art.
export function loadBuildingArt(name: keyof typeof BUILDING_SOURCE_SIZES) {
  const image = loadNativeArt(name);
  image.addEventListener('load', () => {
    image.dataset.artResolution = String(image.naturalWidth / BUILDING_SOURCE_SIZES[name].width);
  });

  return image;
}
