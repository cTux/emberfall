import { test } from "node:test";
import assert from "node:assert/strict";
import { actorFrame, enemyFrame } from "../packages/client-new/src/animation.ts";

test("action frames follow timestamps, do not animate future actions, and death wins", () => {
  assert.equal(actorFrame(999, false, true, 1000), 0);
  assert.equal(actorFrame(1000, true, true, 1000), 5);
  assert.equal(actorFrame(1104, true, true, 1000), 6);
  assert.equal(actorFrame(1260, false, true, 1000), 0);
  assert.equal(actorFrame(1100, true, false, 1000), 7);
  assert.deepEqual(
    [0, 120, 240, 360, 480].map((time) => actorFrame(time, true, true)),
    [1, 2, 3, 4, 1],
  );
});

test("enemy windup, release and locomotion use existing confirmed times", () => {
  const attack = { startedAt: 1000, endsAt: 1650 };
  assert.equal(enemyFrame(999, false, true, attack), 0);
  assert.equal(enemyFrame(1400, true, true, attack), 5);
  assert.equal(enemyFrame(1650, false, true, undefined, 1650), 6);
  assert.equal(enemyFrame(1830, false, true, undefined, 1650), 0);
  assert.equal(enemyFrame(1400, true, false, attack), 7);
});
