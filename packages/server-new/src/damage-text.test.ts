import { test } from "node:test";
import assert from "node:assert/strict";
import type { DamageEvent } from "@emberfall/common-new";
import { combineDamageNumbers, drawDamageNumbers } from "../../client-new/src/damage-text.ts";

const hit = (overrides: Partial<DamageEvent> = {}): DamageEvent => ({
  id: 1,
  ownerId: "p",
  target: "enemy:1",
  damageType: "fire",
  amount: 3,
  at: 1000,
  x: 20,
  y: 30,
  ...overrides,
});

test("combines projectiles and fractional critical damage without mutating events", () => {
  const hits = [hit(), hit({ id: 2, amount: 4.5, critical: true, at: 1009, x: 40 })];
  const before = structuredClone(hits);
  const combined = combineDamageNumbers(hits);
  assert.equal(combined.length, 1);
  assert.equal(combined[0].amount, 7.5);
  assert.equal(combined[0].critical, true);
  assert.equal(combined[0].at, 1000);
  assert.equal(combined[0].x, 20);
  assert.deepEqual(hits, before);
  assert.deepEqual(combineDamageNumbers(hits), combined);
});

test("10 ms is inclusive and windows do not slide, regardless of input order", () => {
  const totals = combineDamageNumbers([hit({ at: 1020 }), hit({ at: 1010 }), hit()]);
  assert.deepEqual(
    totals.map(({ at, amount }) => [at, amount]),
    [
      [1000, 6],
      [1020, 3],
    ],
  );
  assert.equal(combineDamageNumbers([hit(), hit({ at: 1011 })]).length, 2);
});

test("players, targets, damage types and unattributed hits stay separate", () => {
  const hits = [
    hit(),
    hit({ ownerId: "other" }),
    hit({ target: "enemy:2" }),
    hit({ damageType: "poison" }),
    hit({ ownerId: undefined }),
    hit({ ownerId: undefined }),
  ];
  assert.equal(combineDamageNumbers(hits).length, hits.length);
  assert.equal(
    combineDamageNumbers([hit({ damageType: undefined }), hit({ damageType: "physical" })]).length,
    1,
  );
});

test("draws one rounded total at the wrapped projection and expires on the first timestamp", () => {
  const labels: unknown[][] = [];
  const ctx = {
    save() {},
    restore() {},
    strokeText() {},
    fillText(...args: unknown[]) {
      labels.push(args);
    },
  } as unknown as CanvasRenderingContext2D;
  const hits = [hit(), hit({ amount: 4.5, at: 1010, critical: true })];
  drawDamageNumbers(ctx, hits, () => ({ x: -10, y: 100 }), 1010);
  assert.deepEqual(labels, [["8", -10, 55 - 10 / 30]]);
  labels.length = 0;
  drawDamageNumbers(ctx, hits, () => ({ x: 0, y: 0 }), 1751);
  assert.deepEqual(labels, []);
});
