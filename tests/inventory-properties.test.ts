import assert from 'node:assert/strict';
import { test } from 'node:test';
import fc from 'fast-check';
import type { Player } from '../packages/common/src/index.ts';
import { INITIAL_PROGRESS, freshStorages, transferStoredItem } from '../packages/core/src/index.ts';

const resourceQuantity = fc.integer({ min: 1, max: 200 });
const tabIndex = fc.integer({ min: 0, max: 2 });

test('generated deposits and withdrawals conserve quantities, stack bounds and identities', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('log', 'health-potion'),
      fc.array(resourceQuantity, { minLength: 1, maxLength: 20 }),
      fc.array(tabIndex, { minLength: 1, maxLength: 30 }),
      (itemId, quantities, tabs) => {
        const player: Player = {
          ...structuredClone(INITIAL_PROGRESS),
          id: 'hero',
          name: 'Hero',
          x: 0,
          y: 0,
          color: 0,
          backpack: quantities.map((quantity, index) => {
            return { id: `item-${index}`, itemId, quantity };
          }),
          storages: freshStorages(),
        };
        const total = quantities.reduce((sum, quantity) => {
          return sum + quantity;
        }, 0);

        for (const tab of tabs) {
          const id = player.backpack![0].id;
          transferStoredItem(player, tab, id, true);

          while (player.storages![tab].items.length) {
            transferStoredItem(player, tab, player.storages![tab].items[0].id, false);
          }

          const items = player.backpack!;
          assert.equal(
            items.reduce((sum, item) => {
              return sum + item.quantity;
            }, 0),
            total,
          );
          assert(items.length <= 20);
          assert.equal(
            new Set(
              items.map((item) => {
                return item.id;
              }),
            ).size,
            items.length,
          );

          for (const item of items) {
            assert.equal(item.itemId, itemId);
            assert(Number.isSafeInteger(item.quantity) && item.quantity > 0);

            if (itemId === 'log') {
              assert(item.quantity <= 200);
            }
          }
        }
      },
    ),
    { numRuns: 200 },
  );
});

test('rejected transfers cannot partly fill a resource stack or alter either owner', () => {
  fc.assert(
    fc.property(resourceQuantity, tabIndex, fc.boolean(), (quantity, tab, depositing) => {
      const player: Player = {
        ...structuredClone(INITIAL_PROGRESS),
        id: 'hero',
        name: 'Hero',
        x: 0,
        y: 0,
        color: 0,
        backpack: [],
        storages: freshStorages(),
      };
      const source = depositing ? player.backpack! : player.storages![tab].items;
      const target = depositing ? player.storages![tab].items : player.backpack!;
      source.push({ id: 'source', itemId: 'log', quantity: 200 });
      target.push(
        { id: 'partial', itemId: 'log', quantity },
        ...Array.from({ length: depositing ? 39 : 19 }, (_, index) => {
          return { id: `gear-${index}`, itemId: 'warrior-sword', quantity: 1 };
        }),
      );
      const before = structuredClone(player);
      assert.throws(() => {
        transferStoredItem(player, tab, 'source', depositing);
      }, /full/);
      assert.deepEqual(player, before);
    }),
    { numRuns: 200 },
  );
});
