import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { game, PLANT_KINDS } from '../packages/core/src/index.ts';
import { itemArtName } from '../packages/client/src/class-art.ts';

test('every non-plant bundled item resolves to its own shipped artwork', () => {
  const plants = new Set<string>(['plant', ...PLANT_KINDS]);
  const hashes = new Set<string>();
  for (const item of game.registries.items.values()) {
    if (plants.has(item.id)) {
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
