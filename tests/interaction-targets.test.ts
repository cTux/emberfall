import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, INNKEEPER } from '../packages/core/src/index.ts';
import { sceneryInteraction } from '../packages/client/src/interaction-targets.ts';
import type { Scenery } from '../packages/client/src/village.ts';

const scenery = (id: string, name?: string) =>
  ({ id, name, x: 224, y: 510, width: 128, height: 96 }) as Scenery;

test('building interactions retain service names when scenery labels are absent or changed', () => {
  for (const building of BUILDINGS.filter((building) => building.id !== 'inn')) {
    for (const label of [undefined, 'Decorative label']) {
      const target = sceneryInteraction(scenery(`building:${building.id}`, label));
      assert.equal(target?.source.id, building.id);
      assert.equal(target?.source.name, building.name);
      assert.deepEqual(target?.reach, { x: building.doorX, y: building.y + 24 });
    }
  }
});

test('wardrobe and trader interactions retain names without scenery labels', () => {
  assert.equal(sceneryInteraction(scenery('building:wardrobe'))?.source.name, 'Wardrobe');
  assert.equal(sceneryInteraction(scenery('npc:innkeeper'))?.source.name, INNKEEPER.name);
  assert.equal(sceneryInteraction(scenery('building:inn')), null);
  assert.equal(sceneryInteraction(scenery('tree:1')), null);
});
