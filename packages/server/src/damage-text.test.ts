import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DamageEvent } from '@emberfall/common';
import {
  combineDamageNumbers,
  damageTextFrame,
  drawDamageNumber,
  drawDamageNumbers,
} from '../../client/src/damage-text.ts';

const hit = (overrides: Partial<DamageEvent> = {}): DamageEvent => ({
  id: 1,
  ownerId: 'p',
  target: 'enemy:1',
  damageType: 'fire',
  amount: 3,
  at: 1000,
  x: 20,
  y: 30,
  ...overrides,
});

test('positive finishing hits display at least one and zero damage displays no number', () => {
  const labels: string[] = [];
  const ctx = {
    globalAlpha: 1,
    save() {},
    restore() {},
    translate() {},
    scale() {},
    strokeText() {},
    fillText(value: string) {
      labels.push(value);
    },
  } as unknown as CanvasRenderingContext2D;
  for (const amount of [0, 0.01, 0.49, 1, 1.5])
    drawDamageNumber(ctx, hit({ amount }), { x: 0, y: 0 }, 1000);
  assert.deepEqual(labels, ['1', '1', '1', '2']);
});

test('combines projectiles and fractional critical damage without mutating events', () => {
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

test('10 ms is inclusive and windows do not slide, regardless of input order', () => {
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

test('players, targets, damage types and unattributed hits stay separate', () => {
  const hits = [
    hit(),
    hit({ ownerId: 'other' }),
    hit({ target: 'enemy:2' }),
    hit({ damageType: 'poison' }),
    hit({ ownerId: undefined }),
    hit({ ownerId: undefined }),
  ];
  assert.equal(combineDamageNumbers(hits).length, hits.length);
  assert.equal(
    combineDamageNumbers([hit({ damageType: undefined }), hit({ damageType: 'physical' })]).length,
    1,
  );
});

test('draws one rounded total at the wrapped projection and expires on the first timestamp', () => {
  const labels: unknown[][] = [];
  const positions: number[][] = [];
  const ctx = {
    globalAlpha: 1,
    save() {},
    restore() {},
    translate(x: number, y: number) {
      positions.push([x, y]);
    },
    scale() {},
    strokeText() {},
    fillText(...args: unknown[]) {
      labels.push(args);
    },
  } as unknown as CanvasRenderingContext2D;
  const hits = [hit(), hit({ amount: 4.5, at: 1010, critical: true })];
  drawDamageNumbers(ctx, hits, () => ({ x: -10, y: 100 }), 1010);
  assert.deepEqual(labels, [['8', 0, 0]]);
  const frame = damageTextFrame(hits[0], 1010)!;
  assert.deepEqual(positions, [[-10 + frame.x, 100 + frame.y]]);
  labels.length = 0;
  drawDamageNumbers(ctx, hits, () => ({ x: 0, y: 0 }), 1751);
  assert.deepEqual(labels, []);
});

test('battle text pops, settles, rises and fades before the event expires', () => {
  const start = damageTextFrame(hit(), 1000)!;
  const impact = damageTextFrame(hit(), 1080)!;
  const settled = damageTextFrame(hit(), 1220)!;
  const fading = damageTextFrame(hit(), 1600)!;
  const last = damageTextFrame(hit(), 1749)!;
  assert.ok(impact.scale > start.scale);
  assert.equal(settled.scale, 1);
  assert.equal(settled.alpha, 1);
  assert.ok(fading.y < settled.y && settled.y < start.y);
  assert.equal(fading.alpha, 0.5);
  assert.ok(last.alpha < 0.01);
  assert.equal(damageTextFrame(hit(), 999), undefined);
  assert.equal(damageTextFrame(hit(), 1750), undefined);
  assert.equal(damageTextFrame(hit(), 1800), undefined);
});

test('successive hits use stable lanes independent of snapshot order or other hits', () => {
  const hits = Array.from({ length: 5 }, (_, id) => hit({ id }));
  const frames = hits.map((event) => damageTextFrame(event, 1200)!);
  assert.equal(new Set(frames.map((frame) => frame.x)).size, 5);
  for (const [index, event] of hits.entries())
    assert.deepEqual(damageTextFrame(structuredClone(event), 1200), frames[index]);
});
