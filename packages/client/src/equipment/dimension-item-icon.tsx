import { useEffect, useRef } from 'react';
import { dimensionArt, DIMENSION_ITEM_ART, DIMENSION_ATLAS } from '../dimension-art';

// Inventory and merchant rows display 32px icons with 2x backing detail.
const ICON_PIXELS = 64;

export function DimensionItemIcon({ itemId }: { itemId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const { dimension, column } = DIMENSION_ITEM_ART[itemId];
    const image = dimensionArt(dimension, 'items');
    const draw = () => {
      if (!image.naturalWidth) {
        return;
      }

      const width = image.naturalWidth / DIMENSION_ATLAS.columns;
      const ctx = canvas.current?.getContext('2d');
      ctx?.clearRect(0, 0, ICON_PIXELS, ICON_PIXELS);
      ctx?.drawImage(
        image,
        column * width,
        0,
        width,
        image.naturalHeight,
        0,
        0,
        ICON_PIXELS,
        ICON_PIXELS,
      );
    };

    image.addEventListener('load', draw);
    draw();

    return () => {
      image.removeEventListener('load', draw);
    };
  }, [itemId]);

  return <canvas ref={canvas} width={ICON_PIXELS} height={ICON_PIXELS} aria-hidden='true' />;
}
