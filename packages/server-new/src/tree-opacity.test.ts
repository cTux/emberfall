import { test } from "node:test";
import assert from "node:assert/strict";
import { obstacleOpacity } from "../../client-new/src/effects.ts";

test("only overlapping obstacles in front of the local player are 80% transparent", async () => {
  const tree = { x: 100, y: 200, width: 100, height: 100 };
  assert.equal(obstacleOpacity(tree, { x: 100, y: 160 }), 0.2);
  assert.equal(obstacleOpacity(tree, { x: 165, y: 160 }), 0.2);
  assert.equal(obstacleOpacity(tree, { x: 175, y: 160 }), 1);
  assert.equal(obstacleOpacity(tree, { x: 100, y: 185 }), 1);
  assert.equal(obstacleOpacity(tree, { x: 174, y: 160 }), 1);
  assert.equal(obstacleOpacity(tree, { x: 100, y: 82 }), 1);
  assert.equal(obstacleOpacity(tree, { x: 100, y: 200 }), 1);
  assert.equal(obstacleOpacity(tree, { x: 100, y: 70 }), 1);
  assert.equal(obstacleOpacity(tree, undefined), 1);
  // Forest trees are already positioned in the camera's wrapped coordinate space.
  assert.equal(obstacleOpacity({ ...tree, x: -20 }, { x: 5, y: 160 }), 0.2);
});

test("actors fade only when their foot anchor is in front of the local player", () => {
  for (const [width, height, footOffset] of [
    [48, 48, 15],
    [76, 76, 15],
    [42.5, 40, 18],
    [24, 24, 0],
  ]) {
    const actor = { x: 100, y: 200 + footOffset, width, height };
    assert.equal(obstacleOpacity(actor, { x: 100, y: actor.y - 25 }), 0.2);
    assert.equal(obstacleOpacity(actor, { x: 100, y: actor.y - 15 }), 1);
    assert.equal(obstacleOpacity(actor, { x: 100, y: 220 }), 1);
    assert.equal(obstacleOpacity(actor, { x: 200, y: actor.y - 25 }), 1);
    assert.equal(obstacleOpacity(actor, { x: 100, y: 100 }), 1);
  }
});
