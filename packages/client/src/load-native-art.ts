import { artImages } from './art-images.ts';
import { artUrl } from './art-url.ts';

export function loadNativeArt(name: string) {
  const image = new Image();
  image.onload = () => {
    image.dataset.artReady = 'true';
  };

  artImages.push(image);
  image.src = artUrl(name);

  return image;
}
