import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawDamageNumbers } from '../packages/client/src/damage-text.ts';
import type { DamageEvent } from '../packages/common/src/scene.ts';

test('damage numbers can show only local outgoing and incoming damage without changing events', () => {
  const hits: DamageEvent[] = [
    { id: 1, ownerId: 'me', target: 'enemy:1', amount: 11, x: 0, y: 0, at: 1000 },
    { id: 2, ownerId: 'other', target: 'enemy:1', amount: 22, x: 0, y: 0, at: 1000 },
    { id: 3, target: 'me', amount: 33, x: 0, y: 0, at: 1000 },
    { id: 4, target: 'other', amount: 44, x: 0, y: 0, at: 1000 },
  ];
  const original = structuredClone(hits);
  const drawn: string[] = [];
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    strokeText() {},
    fillText(value: string) {
      drawn.push(value);
    },
  } as unknown as CanvasRenderingContext2D;
  const project = () => {
    return { x: 0, y: 0 };
  };

  drawDamageNumbers(ctx, hits, project, 1100, 'me');
  assert.deepEqual(drawn, ['11', '33']);
  drawn.length = 0;
  drawDamageNumbers(ctx, hits, project, 1100);
  assert.deepEqual(drawn, ['11', '22', '33', '44']);
  assert.deepEqual(hits, original);
});
