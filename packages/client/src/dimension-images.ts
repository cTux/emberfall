import type { NewDimension } from './dimension-art-layout';
import { clientAsset } from './urls';
import { artImages } from './art-loader';
const images = new Map<string, HTMLImageElement>();
export function dimensionArt(
  dimension: NewDimension,
  kind: 'terrain' | 'scenery' | 'items' | 'enemies' | 'boss',
) {
  const key = `${dimension}-${kind}`;
  const cached = images.get(key);

  if (cached) {
    return cached;
  }

  const image = new Image();
  image.onload = () => {
    image.dataset.artReady = 'true';
  };

  image.src = clientAsset(`/assets/dimensions/${key}.png`);
  images.set(key, image);
  artImages.push(image);

  return image;
}
