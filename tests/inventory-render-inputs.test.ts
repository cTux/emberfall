import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Player } from '../packages/common/src/index.ts';
import { sameInventoryPlayer } from '../packages/client/src/equipment/same-inventory-player.ts';

const player: Player = {
  id: 'hero',
  name: 'Hero',
  x: 0,
  y: 0,
  color: 0,
  playtimeSeconds: 0,
  level: 1,
  experience: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  classId: 'warrior',
  equipment: { weapon: 'warrior-sword' },
  backpack: [{ id: 'potion', itemId: 'health-potion', quantity: 1 }],
};

test('inventory rendering ignores movement and damage in detached snapshots', () => {
  const next = structuredClone(player);
  next.x = 50;
  next.hitpoints = 20;
  assert.equal(sameInventoryPlayer(player, next), true);
});

test('every inventory view input invalidates rendering, including same-id item changes', () => {
  const changes: Partial<Player>[] = [
    { classId: 'ranger' },
    { autoTarget: false },
    { coins: 5 },
    { equipment: { weapon: null } },
    {
      equipmentItems: {
        weapon: { id: 'sword', itemId: 'warrior-sword', quantity: 1, stats: { power: 3 } },
      },
    },
    { talents: { 'warrior:0:0': 1 } },
    { backpack: [{ ...player.backpack![0], quantity: 2 }] },
  ];

  for (const change of changes) {
    assert.equal(sameInventoryPlayer(player, { ...player, ...change }), false);
  }
});
