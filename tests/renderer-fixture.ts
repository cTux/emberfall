import { compareSurfaces } from './renderer-surfaces.fixture';
import { compareLighting } from './renderer-lighting.fixture';
import { compareDamage } from './renderer-damage.fixture';
import { compareLoot } from './renderer-loot.fixture';
import { compareBattleText } from './renderer-battle-text.fixture';
import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { drawVignette } from '../packages/client/src/effects';

import { statusImages } from '../packages/client/src/combat-assets';

export type PixelComparison = (
  name: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
  x: number,
  y: number,
) => void;

export async function compare() {
  await Promise.all(
    Object.values(statusImages).map((image) => {
      return image.decode();
    }),
  );
  const gpu = document.createElement('canvas'),
    reference = document.createElement('canvas');
  document.body.append(gpu, reference);
  reference.width = reference.height = 256;
  const pixi = new PixiContext(gpu);
  pixi.resize(256, 256);
  await pixi.ready;
  const canvas = reference.getContext('2d')!;
  const results: Record<string, { actual: number[]; expected: number[] }> = {};
  const icons: Record<string, number> = {};
  const stackLabels: Record<string, string[]> = {};
  const compare = (
    name: string,
    draw: (ctx: CanvasRenderingContext2D) => void,
    x: number,
    y: number,
  ) => {
    pixi.begin();
    canvas.reset();
    for (const ctx of [pixi as unknown as CanvasRenderingContext2D, canvas]) {
      ctx.fillStyle = '#809060';
      ctx.fillRect(0, 0, 256, 256);
      draw(ctx);
    }

    pixi.present();
    const capture = document.createElement('canvas');
    capture.width = capture.height = 256;
    const ctx = capture.getContext('2d')!;
    ctx.drawImage(gpu, 0, 0);
    results[name] = {
      actual: [...ctx.getImageData(x, y, 1, 1).data],
      expected: [...canvas.getImageData(x, y, 1, 1).data],
    };
    if (name in statusImages) {
      // Exclude the stack numeral and count colored glyph pixels, allowing the
      // small antialiasing differences between SVG scaling and nearest textures.
      const pixels = ctx.getImageData(80, 88, 12, 6).data;
      icons[name] = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
        if (Math.max(...channels) - Math.min(...channels) > 40) {
          icons[name]++;
        }
      }

      delete results[name];
    }
  };

  compareSurfaces(compare, canvas, stackLabels);
  const { lights, edges } = compareLighting(pixi, gpu);
  // Leave both renderers showing the same composited scene for visual inspection.
  compare(
    'composite',
    (ctx) => {
      for (const [i, image] of Object.values(statusImages).entries()) {
        ctx.drawImage(image, 20 + i * 55, 100, 40, 40);
      }

      drawVignette(ctx, 0, 0, 256, 256);
    },
    128,
    128,
  );
  const { damagePixels, groupedLabels } = compareDamage(pixi, gpu);
  const { projectilePixels, lootPixels, rarityPixels } = await compareLoot(pixi, gpu);
  const battleTextPixels = compareBattleText(pixi, gpu);
  pixi.destroy();

  return {
    results,
    icons,
    stackLabels,
    lights,
    edges,
    damagePixels,
    groupedLabels,
    projectilePixels,
    lootPixels,
    rarityPixels,
    battleTextPixels,
  };
}
