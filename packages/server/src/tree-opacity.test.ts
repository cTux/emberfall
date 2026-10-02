import { test } from "node:test";
import assert from "node:assert/strict";
import { obstacleOpacity } from "../../client/src/effects.ts";

test("only overlapping obstacles in front of the local player are 80% transparent", () => {
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
