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
  const bram = { ...scenery('npc:craftsman'), npc: { name: 'Bram the Craftsman' } } as Scenery;
  assert.equal(sceneryInteraction(bram)?.source.name, 'Bram the Craftsman');
  assert.equal(sceneryInteraction(scenery('building:inn')), null);
  assert.equal(sceneryInteraction(scenery('tree:1'))?.source.id, 'gather:tree:1');
});

test('resources expose gathering masks and depleted nodes have no active hover target', () => {
  for (const id of ['tree:1', 'plant:1', 'rock:1', 'forest:0:0']) {
    const object = scenery(id);
    const target = sceneryInteraction(object)!;
    assert.equal(target.source.id, `gather:${id}`);
    assert.equal(target.radius, 65);
    assert.deepEqual(target.reach, object);
    assert.equal(sceneryInteraction({ ...object, gathered: true }), null);
  }
});
