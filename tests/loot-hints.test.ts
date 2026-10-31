import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LootHints, lootHintFrame } from '../packages/client/src/loot-hints.ts';

const item = (itemId: string, quantity = 1, id = itemId) => {
  return { id, itemId, quantity };
};

test('confirmed quantity increases are silent on join and never replay snapshots', () => {
  const hints = new LootHints();
  hints.observe([item('stone', 3)], true, 0);
  assert.equal(hints.hints.length, 0);
  hints.observe([item('stone', 5)], true, 100);
  assert.deepEqual(hints.hints, [{ itemId: 'stone', quantity: 2, at: 100 }]);
  hints.observe([item('stone', 5)], true, 150);
  assert.equal(hints.hints.length, 1);
  hints.observe([item('stone', 1, 'a'), item('stone', 4, 'b')], true, 200);
  assert.equal(hints.hints.length, 1);
  hints.observe([], true, 300);
  assert.equal(hints.hints.length, 1);
  hints.observe([], true, 2200);
  assert.equal(hints.hints.length, 0);
});
test('no stack cap, disabled receipts and reconnects stay silent', () => {
  const hints = new LootHints();
  hints.observe([], true, 0);
  const items = Array.from({ length: 20 }, (_, i) => {
    return item(`item-${i}`);
  });
  hints.observe(items, true, 10);
  assert.equal(hints.hints.length, 20);
  hints.observe([...items, item('extra')], false, 20);
  assert.equal(hints.hints.length, 0);
  hints.observe([...items, item('extra')], true, 30);
  assert.equal(hints.hints.length, 0);
  hints.observe(undefined, true, 40);
  hints.observe(items, true, 50);
  assert.equal(hints.hints.length, 0);
});
test('fast entrance, one-second hold, upward fade and expiry', () => {
  assert.equal(lootHintFrame(0, -1), undefined);
  assert.deepEqual(lootHintFrame(0, 0), { alpha: 0, offset: 16, height: 0 });
  assert.deepEqual(lootHintFrame(0, 200), { alpha: 1, offset: 0, height: 20 });
  assert.deepEqual(lootHintFrame(0, 1200), lootHintFrame(0, 200));
  assert.deepEqual(lootHintFrame(0, 1650), { alpha: 0.5, offset: -9, height: 10 });
  assert.equal(lootHintFrame(0, 2100), undefined);
});
