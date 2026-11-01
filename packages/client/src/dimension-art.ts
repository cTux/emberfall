import { artImages } from './art-loader';
import { clientAsset } from './urls';

export { DIMENSION_ITEM_ART, DIMENSION_ATLAS } from './dimension-art-layout';
import { DIMENSION_SPRITES, DIMENSION_ATLAS, type NewDimension } from './dimension-art-layout';
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

const actors = new Map<string, HTMLImageElement>();
// Existing actor consumers address four facing columns and eight action rows.
const ACTION_ROWS = [0, 1, 2, 1, 2, 3, 3, 4];
const ACTOR_PACKING = { columns: 4, rows: 8, gutter: 8, footPadding: 3, leftFacing: 2 } as const;

export function dimensionEnemyArt(id: keyof typeof DIMENSION_SPRITES, boss = false) {
  const key = `${id}:${boss}`;
  const cached = actors.get(key);

  if (cached) {
    return cached;
  }

  const { dimension, column } = DIMENSION_SPRITES[id];
  const source = dimensionArt(dimension, boss ? 'boss' : 'enemies');
  const result = new Image();
  result.dataset.artResolution = String(DIMENSION_ATLAS.backing);
  actors.set(key, result);
  artImages.push(result);
  const pack = () => {
    const cell = DIMENSION_ATLAS.actorCell;
    const output = document.createElement('canvas');
    output.width = ACTOR_PACKING.columns * cell * DIMENSION_ATLAS.backing;
    output.height = ACTOR_PACKING.rows * cell * DIMENSION_ATLAS.backing;
    const ctx = output.getContext('2d')!;
    ctx.scale(DIMENSION_ATLAS.backing, DIMENSION_ATLAS.backing);
    const width = source.naturalWidth / (boss ? 1 : DIMENSION_ATLAS.columns);
    const height = source.naturalHeight / DIMENSION_ATLAS.enemyRows;

    for (const [row, sourceRow] of ACTION_ROWS.entries()) {
      for (let facing = 0; facing < ACTOR_PACKING.columns; facing++) {
        ctx.save();
        ctx.translate(facing * cell + cell / 2, row * cell + cell - ACTOR_PACKING.footPadding);

        if (facing === ACTOR_PACKING.leftFacing) {
          ctx.scale(-1, 1);
        }

        ctx.drawImage(
          source,
          (boss ? 0 : column) * width,
          sourceRow * height,
          width,
          height,
          -(cell - ACTOR_PACKING.gutter) / 2,
          -(cell - ACTOR_PACKING.gutter) * DIMENSION_ATLAS.footAnchor,
          cell - ACTOR_PACKING.gutter,
          cell - ACTOR_PACKING.gutter,
        );
        ctx.restore();
      }
    }

    result.onload = () => {
      result.dataset.artReady = 'true';
    };

    result.src = output.toDataURL();
  };

  if (source.complete && source.naturalWidth) {
    pack();
  } else {
    source.addEventListener('load', pack, { once: true });
  }

  return result;
}
