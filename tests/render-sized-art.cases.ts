import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { IMAGE_RENDER_BOUNDS } from '../packages/client/asset-render-sizes.ts';

test('resized terrain keeps seamless edges and all five building crops and chimney anchors', async ({
  page,
}) => {
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    root: resolve('packages/client'),
    logLevel: 'error',
    build: {
      write: false,
      lib: {
        entry: resolve('tests/village-scenery-fixture.ts'),
        name: 'ScenerySizing',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => {
    return item.type === 'chunk';
  }).code;
  await page.addInitScript(() => {
    const samples: Record<string, number> = {};
    (window as unknown as { artSampling: typeof samples }).artSampling = samples;
    const prototype = CanvasRenderingContext2D.prototype;
    // eslint-disable-next-line typescript/unbound-method -- Reflect.apply forwards the original Canvas receiver.
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(
        target,
        context: CanvasRenderingContext2D,
        args: Parameters<typeof prototype.drawImage>,
      ) {
        const [source, , , sw, sh, , , dw, dh] = args;

        if (
          source instanceof HTMLImageElement &&
          source.src.startsWith('http') &&
          dh !== undefined
        ) {
          const name = new URL(source.src).pathname.split('/assets/')[1];
          const transform = context.getTransform();
          samples[name] = Math.max(
            samples[name] ?? 0,
            (Math.abs(transform.a) * dw) / sw,
            (Math.abs(transform.d) * dh) / sh,
          );
        }

        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto('/?art-gallery');
  await page.addScriptTag({ content: code });
  await page.waitForFunction(() => {
    const fixture = (
      window as unknown as { ScenerySizing: typeof import('./village-scenery-fixture') }
    ).ScenerySizing;

    return (
      fixture.terrainArt.complete &&
      fixture.terrainArt.naturalWidth > 0 &&
      fixture.artImages.every((image) => {
        return image.complete && image.dataset.artReady === 'true';
      })
    );
  });
  const result = await page.evaluate(() => {
    const fixture = (
      window as unknown as { ScenerySizing: typeof import('./village-scenery-fixture') }
    ).ScenerySizing;
    const { nature, houses, wardrobe, lampPost, lantern } = fixture.villageImages;
    const buildings = fixture
      .villageSprites(nature, houses, wardrobe, lampPost, lantern)
      .filter((object) => {
        return object.id.startsWith('building:') && object.id !== 'building:wardrobe';
      })
      .map((object) => {
        const canvas = object.sprite;
        const pixels = canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height).data;

        return {
          id: object.id,
          width: object.width,
          height: object.height,
          chimney: object.chimney,
          opaque: pixels.filter((value, index) => {
            return index % 4 === 3 && value > 128;
          }).length,
        };
      });
    const seams = [0, 1, 2].map((column) => {
      const tile = fixture.terrainTile(column);
      const context = tile.getContext('2d')!;
      const left = context.getImageData(0, 0, 1, tile.height).data;
      const right = context.getImageData(tile.width - 1, 0, 1, tile.height).data;
      const top = context.getImageData(0, 0, tile.width, 1).data;
      const bottom = context.getImageData(0, tile.height - 1, tile.width, 1).data;

      return (
        left.every((value, index) => {
          return value === right[index];
        }) &&
        top.every((value, index) => {
          return value === bottom[index];
        })
      );
    });

    return {
      buildings,
      seams,
      sampling: (window as unknown as { artSampling: Record<string, number> }).artSampling,
    };
  });
  expect(result.seams).toEqual([true, true, true]);
  expect(result.buildings).toHaveLength(5);

  for (const [name, scale] of Object.entries(result.sampling)) {
    if (IMAGE_RENDER_BOUNDS[name]) {
      // One percent permits single-pixel rounding when trimmed frames are fitted into their backing cells.
      const ROUNDING_TOLERANCE = 1.01;
      expect(
        scale,
        `${name} has enough visible pixels after transparency trimming`,
      ).toBeLessThanOrEqual(ROUNDING_TOLERANCE);
    }
  }

  for (const building of result.buildings) {
    expect(building.opaque, building.id).toBeGreaterThan(1000);
    expect(building.width, building.id).toBe(building.id === 'building:lodge' ? 96 : 128);
    expect(building.height, building.id).toBeGreaterThan(90);

    if (building.id === 'building:storehouse') {
      expect(building.chimney).toBeUndefined();
    } else {
      expect(building.chimney!.x).toBeGreaterThan(-building.width / 2);
      expect(building.chimney!.x).toBeLessThan(building.width / 2);
      expect(building.chimney!.y).toBeLessThan(0);
    }
  }
});
