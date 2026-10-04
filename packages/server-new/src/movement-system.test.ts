import { test } from "node:test";
import assert from "node:assert/strict";
import { stepMovement, type MovementInput } from "./systems/movement.ts";
import { freshProgress } from "./characters.ts";
import type { Player } from "@emberfall/common-new";

test("untimed heartbeat movement includes age 250ms and stops immediately after it", () => {
  for (const phase of [0, 49]) {
    const player: Player = { ...freshProgress(), id: "p", name: "p", x: 420, y: 340, color: 0 };
    const input: MovementInput = {
      x: 1,
      y: 0,
      inputAt: 1000,
      lastSeq: 1,
      epoch: "lobby",
      inputs: [],
    };
    for (let age = phase; age <= 250; age += 50) stepMovement(input, player, undefined, 1000 + age);
    assert.equal(player.x, phase === 0 ? 474 : 465);
    const stopped = player.x;
    stepMovement(input, player, undefined, 1251);
    stepMovement(input, player, undefined, 1300);
    assert.equal(player.x, stopped);
    assert.equal(player.inputX, 0);
  }
});

test("a fixed tick consumes partial commands once and bounds a queued burst", () => {
  const player: Player = { ...freshProgress(), id: "p", name: "p", x: 420, y: 340, color: 0 };
  const input: MovementInput = {
    timed: true,
    x: 0,
    y: 0,
    inputAt: 1000,
    lastSeq: 2,
    inputs: [
      { seq: 1, epoch: "lobby", x: 1, y: 0, durationMs: 20 },
      { seq: 2, epoch: "lobby", x: 1, y: 0, durationMs: 40 },
    ],
  };
  stepMovement(input, player, undefined, 1000);
  assert.equal(player.x, 429);
  assert.equal(player.inputSeq, 2);
  assert.equal(player.inputElapsed, 30);
  stepMovement(input, player, undefined, 1050);
  assert.equal(player.x, 430.8);
  stepMovement(input, player, undefined, 1100);
  assert.equal(player.x, 430.8);
  input.inputs = Array.from({ length: 100 }, (_, seq) => ({
    seq: seq + 3,
    epoch: "lobby",
    x: 1,
    y: 0,
    durationMs: 50,
  }));
  for (let tick = 0; tick < 10; tick++) {
    const before: number = player.x;
    stepMovement(input, player, undefined, 1150 + tick * 50);
    assert(Math.abs(player.x - before) <= 9.0001);
  }
  assert.equal(input.inputs.length, 90);
});
