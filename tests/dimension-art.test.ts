import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DIMENSION_ATLAS } from '../packages/client/src/dimension-art-layout.ts';

const require = createRequire(resolve('packages/client/package.json'));
const sharp =
  require('sharp') as typeof import('../packages/client/node_modules/sharp/lib/index.js');

test('dimension sprite grids contain separate transparent subjects and distinct animated poses', async () => {
  const hashes = new Set<string>();

  for (const dimension of ['swamp', 'desert']) {
    for (const [kind, columns, rows] of [
      ['scenery', DIMENSION_ATLAS.columns, DIMENSION_ATLAS.sceneryRows],
      ['enemies', DIMENSION_ATLAS.columns, DIMENSION_ATLAS.enemyRows],
      ['boss', 1, DIMENSION_ATLAS.enemyRows],
    ] as const) {
      const image = sharp(`packages/client/public/assets/dimensions/${dimension}-${kind}.png`);
      const metadata = await image.metadata();
      assert.equal(metadata.hasAlpha, true);
      const width = metadata.width / columns;
      const height = metadata.height / rows;
      assert.equal(width, height, `${dimension}-${kind} cells must be square`);

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const { data, info } = await image
            .clone()
            .extract({ left: column * width, top: row * height, width, height })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          let opaque = 0;

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const alpha = data[(y * width + x) * info.channels + info.channels - 1];

              if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                assert.equal(alpha, 0, `${dimension}-${kind} frame touches its edge`);
              }

              if (alpha > 0) {
                opaque++;
              }
            }
          }

          assert.ok(opaque > 0 && opaque < width * height, 'frame must contain a visible cutout');
          const hash = createHash('sha256').update(data).digest('hex');
          assert.ok(!hashes.has(hash), `${dimension}-${kind} duplicates another subject or pose`);
          hashes.add(hash);
        }
      }
    }
  }
});
