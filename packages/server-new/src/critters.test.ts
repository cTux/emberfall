import { test } from "node:test";
import assert from "node:assert/strict";
import { crittersAt } from "../../client-new/src/critters.ts";

test("ambient critters wander, stay bounded, cull and repeat across forest seams", async () => {
  const lobby = { x: 0, y: 0, width: 960, height: 640 };
  const first = crittersAt("village", 0, lobby);
  assert.equal(first.length, 6);
  assert.deepEqual(first, crittersAt("village", 12000, lobby));
  assert.notDeepEqual(first, crittersAt("village", 2000, lobby));
  for (let now = 0; now < 12000; now += 100) {
    const critters = crittersAt("village", now, lobby);
    critters.forEach((p, i) => {
      assert.ok(Math.abs(p.x - first[i]!.x) <= 40);
      assert.ok(p.frame === 0 || p.frame === 1);
      assert.equal(p.y, first[i]!.y);
    });
  }
  assert.deepEqual(crittersAt("village", 0, { x: 1000, y: 1000, width: 100, height: 100 }), []);
  const bounds = { x: 2080, y: 960, width: 960, height: 640 };
  const forest = crittersAt("forest", 2000, bounds);
  assert.ok(forest.length > 0);
  const repeated = crittersAt("forest", 2000, { ...bounds, x: bounds.x + 4800 });
  assert.equal(repeated.length, forest.length);
  repeated.forEach((p, i) => {
    assert.ok(Math.abs(p.x - 4800 - forest[i]!.x) < 1e-9);
    assert.deepEqual({ ...p, x: 0 }, { ...forest[i]!, x: 0 });
  });
});
