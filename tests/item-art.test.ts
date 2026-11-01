import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  DIMENSION_ITEM_ART,
  DIMENSION_ATLAS,
} from '../packages/client/src/dimension-art-layout.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { game, PLANT_KINDS } from '../packages/core/src/index.ts';
import { itemArtName } from '../packages/client/src/class-art.ts';

test('every non-plant bundled item resolves to its own shipped artwork', async () => {
  const require = createRequire(resolve('packages/client/package.json'));
  const sharp =
    require('sharp') as typeof import('../packages/client/node_modules/sharp/lib/index.js');
  const plants = new Set<string>(['plant', ...PLANT_KINDS]);
  const hashes = new Set<string>();

  for (const item of game.registries.items.values()) {
    if (plants.has(item.id)) {
      continue;
    }

    if (Object.hasOwn(DIMENSION_ITEM_ART, item.id)) {
      const { dimension, column } = DIMENSION_ITEM_ART[item.id];
      const image = sharp(`packages/client/public/assets/dimensions/${dimension}-items.png`);
      const metadata = await image.metadata();
      const width = metadata.width / DIMENSION_ATLAS.columns;
      const bytes = await image
        .extract({ left: column * width, top: 0, width, height: metadata.height })
        .raw()
        .toBuffer();
      const hash = createHash('sha256').update(bytes).digest('hex');
      assert(!hashes.has(hash), `Reused artwork for ${item.id}`);
      hashes.add(hash);
      continue;
    }

    const name = itemArtName(item.id);
    assert(name, `Missing artwork mapping for ${item.id}`);
    assert(!name.startsWith('slot-'), `Placeholder for ${item.id}`);
    const bytes = readFileSync(`packages/client/public/assets/wardrobe-style/${name}.png`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert(!hashes.has(hash), `Reused artwork for ${item.id}`);
    hashes.add(hash);
  }
});
