import { loadArt } from './load-art.ts';
import { SOURCE_ATLAS } from './source-atlas.ts';
import { loadedArt } from './loaded-art.ts';
import { artImages } from './art-images.ts';
import { softenAtlas } from './soften-atlas.ts';
import { artUrl } from './art-url.ts';
import { ACTOR_CELL } from './animation';

export const actorArt = (name: string) => {
  if (!['warrior', 'ranger', 'mage', 'druid'].includes(name)) {
    return loadArt(name, SOURCE_ATLAS.columns, SOURCE_ATLAS.rows, ACTOR_CELL, true);
  }

  const key = `${name}:player-atlas`;
  const cached = loadedArt.get(key);

  if (cached) {
    return cached;
  }

  const image = new Image();
  image.dataset.artResolution = '2';
  loadedArt.set(key, image);
  artImages.push(image);
  const source = new Image();
  source.onload = () => {
    const output = document.createElement('canvas');
    output.width = source.naturalWidth;
    output.height = source.naturalHeight;
    output.getContext('2d')!.drawImage(source, 0, 0);
    softenAtlas(output);
    image.src = output.toDataURL();
    image.dataset.artReady = 'true';
  };

  source.src = artUrl(`${name}-atlas`);

  return image;
};
