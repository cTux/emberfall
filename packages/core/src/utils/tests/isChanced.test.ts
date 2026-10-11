import assert from "node:assert/strict";
import test from "node:test";
import { isChanced } from "../../index.ts";

test("isChanced compares a random roll against a percentage", (t) => {
  t.mock.method(Math, "random", () => 0.25);
  assert.equal(isChanced(25.1), true);
  assert.equal(isChanced(25), false);
  assert.equal(isChanced(24.9), false);
});

test("isChanced handles percentage boundaries and non-finite numbers", (t) => {
  for (const roll of [0, 0.9999999999999999]) {
    t.mock.method(Math, "random", () => roll);
    for (const percent of [-Infinity, -1, 0, NaN]) {
      assert.equal(isChanced(percent), false);
    }
    for (const percent of [100, 101, Infinity]) {
      assert.equal(isChanced(percent), true);
    }
    t.mock.restoreAll();
  }
});

test("isChanced skips random rolls for guaranteed outcomes", (t) => {
  const random = t.mock.method(Math, "random", () => 0.5);
  for (const percent of [-Infinity, -1, 0]) {
    assert.equal(isChanced(percent), false);
  }
  for (const percent of [100, 101, Infinity]) {
    assert.equal(isChanced(percent), true);
  }
  assert.equal(random.mock.callCount(), 0);
});
