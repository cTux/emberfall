import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA,
  BUILDINGS,
  PLANTS,
  PLANT_KINDS,
  ROCKS,
  TORCHES,
  TRAINING_ZONES,
  TREES,
  onPath,
  moveActor,
} from '../packages/core/src/index.ts';

test('village rocks and all five plant kinds leave paths and service clearings open', () => {
  assert(ROCKS.length > 100);
  assert(PLANTS.length > 400);
  assert.equal(PLANT_KINDS.length, 5);
  assert.equal(new Set(PLANTS.map((plant) => plant.variant)).size, 5);
  for (const collection of [ROCKS, PLANTS]) {
    assert(Object.isFrozen(collection));
    for (const object of collection) {
      assert(Object.isFrozen(object));
      assert(object.x >= 35 && object.x < ARENA.width - 35);
      assert(object.y >= 55 && object.y < ARENA.height - 30);
      assert(!onPath(object.x, object.y, 55));
      assert(Math.hypot((object.x - 480) / 190, (object.y - 355) / 110) >= 1);
      assert(
        TRAINING_ZONES.every(
          (zone) => Math.hypot(object.x - zone.x, object.y - zone.y) >= zone.clearingRadius + 35,
        ),
      );
      assert(
        BUILDINGS.every(
          (building) =>
            Math.abs(object.x - building.x) >= 100 ||
            object.y <= building.y - 130 ||
            object.y >= building.y + 65,
        ),
      );
      assert(TORCHES.every((torch) => Math.hypot(object.x - torch.x, object.y - torch.y) >= 45));
      assert(TREES.every((tree) => Math.hypot(object.x - tree.x, object.y - tree.y) >= 48));
      // Normal player movement disables scenery collision, including for these new props.
      assert.deepEqual(moveActor({ x: object.x - 20, y: object.y }, 40, 0, 12, false), {
        x: object.x + 20,
        y: object.y,
      });
    }
  }
  const decorations = [...ROCKS, ...PLANTS];
  for (let i = 0; i < decorations.length; i++)
    for (let j = i + 1; j < decorations.length; j++)
      assert(
        Math.hypot(decorations[i].x - decorations[j].x, decorations[i].y - decorations[j].y) >= 48,
      );
});
