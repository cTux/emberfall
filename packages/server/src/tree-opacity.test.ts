import { test } from "node:test";
import assert from "node:assert/strict";
import { treeOpacity } from "../../client/src/effects.ts";

test("only overlapping trees in front of the local player are 85% transparent", () => {
  const tree = { x: 100, y: 200, width: 100, height: 100 };
  assert.equal(treeOpacity(tree, { x: 100, y: 160 }), 0.15);
  assert.equal(treeOpacity(tree, { x: 165, y: 160 }), 0.15);
  assert.equal(treeOpacity(tree, { x: 175, y: 160 }), 1);
  assert.equal(treeOpacity(tree, { x: 100, y: 200 }), 1);
  assert.equal(treeOpacity(tree, { x: 100, y: 70 }), 1);
  assert.equal(treeOpacity(tree, undefined), 1);
  // Forest trees are already positioned in the camera's wrapped coordinate space.
  assert.equal(treeOpacity({ ...tree, x: -20 }, { x: 5, y: 160 }), 0.15);
});
