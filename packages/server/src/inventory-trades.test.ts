import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  tradeItem,
  freshMerchant,
  sellAll,
  merchantSchema,
  BUYBACK_SLOTS,
  INVENTORY_SLOTS,
  clientMessage,
} from '@emberfall/core';

import { hero, item } from './inventory.fixture.ts';

test('trade amounts transfer ten or a whole stack at the total price, including buyback', () => {
  const player = hero();
  player.coins = 1000;
  const merchant = freshMerchant();
  const bottle = merchant.backpack.find((entry) => {
    return entry.itemId === 'empty-bottle';
  })!;
  tradeItem(player, merchant, bottle.id, true, 10);
  assert.equal(bottle.quantity, 190);
  assert.equal(player.backpack![0].quantity, 10);
  assert.equal(player.coins, 990);
  assert.equal(merchant.coins, 5010);
  tradeItem(player, merchant, bottle.id, true, 'stack');
  assert.equal(player.backpack![0].quantity, 200);
  assert.equal(player.coins, 800);
  assert.equal(merchant.coins, 5200);
  assert(
    !merchant.backpack.some((entry) => {
      return entry.id === bottle.id;
    }),
  );
  tradeItem(player, merchant, player.backpack![0].id, false, 10);
  assert.equal(player.backpack![0].quantity, 190);
  assert.equal(merchant.buyback[0].quantity, 10);
  assert.equal(player.coins, 810);
  tradeItem(player, merchant, merchant.buyback[0].id, true, 'stack');
  assert.equal(player.backpack![0].quantity, 200);
  tradeItem(player, merchant, player.backpack![0].id, false, 'stack');
  assert.equal(player.backpack!.length, 0);
  assert.equal(merchant.buyback[0].quantity, 200);
  assert.equal(player.coins, 1000);
  assert.equal(merchant.coins, 5000);
  const potion = merchant.backpack.find((entry) => {
    return entry.itemId === 'health-potion';
  })!;
  tradeItem(player, merchant, potion.id, true, 10);
  assert.equal(player.backpack![0].quantity, 5);
});

test('bulk trades reject invalid amounts, insufficient gold, full inventory and overflow atomically', () => {
  const player = hero();
  const merchant = freshMerchant();
  const bottle = merchant.backpack.find((entry) => {
    return entry.itemId === 'empty-bottle';
  })!;
  const rejectsUnchanged = (action: () => void, error: RegExp) => {
    const before = structuredClone({ player, merchant });
    assert.throws(action, error);
    assert.deepEqual({ player, merchant }, before);
  };

  player.coins = 9;
  rejectsUnchanged(() => {
    return tradeItem(player, merchant, bottle.id, true, 10);
  }, /gold/);
  player.coins = 1000;
  player.backpack = Array.from({ length: INVENTORY_SLOTS }, () => {
    return item('loot-helmet');
  });
  rejectsUnchanged(() => {
    return tradeItem(player, merchant, bottle.id, true, 'stack');
  }, /full/);
  player.backpack = [item('empty-bottle', 20)];
  merchant.coins = 9;
  rejectsUnchanged(() => {
    return tradeItem(player, merchant, player.backpack![0].id, false, 10);
  }, /gold/);
  merchant.coins = Number.MAX_SAFE_INTEGER;
  rejectsUnchanged(() => {
    return tradeItem(player, merchant, bottle.id, true, 10);
  }, /balance/);
  for (const amount of [0, -1, 2, 1.5, 'all', null, Number.MAX_SAFE_INTEGER]) {
    assert.equal(
      clientMessage.safeParse({ type: 'trade', id: bottle.id, buying: true, amount }).success,
      false,
    );
  }

  for (const amount of [undefined, 1, 10, 'stack']) {
    assert.equal(
      clientMessage.safeParse({ type: 'trade', id: bottle.id, buying: true, amount }).success,
      true,
    );
  }
});

test('shared merchant trades conserve items and gold, reject stale and unaffordable purchases', () => {
  const player = hero();
  const merchant = freshMerchant();
  const helmet = item('loot-helmet');
  player.backpack = [helmet];
  tradeItem(player, merchant, helmet.id, false);
  assert.equal(player.coins, 1);
  assert.equal(merchant.coins, 4999);
  assert.equal(player.backpack.length, 0);
  const sold = merchant.buyback.find((item) => {
    return item.itemId === helmet.itemId;
  })!;
  const second = hero();
  second.coins = 1;
  tradeItem(second, merchant, sold.id, true);
  assert.equal(second.coins, 0);
  assert.equal(second.backpack![0].itemId, helmet.itemId);
  assert.equal(merchant.coins, 5000);
  assert.throws(() => {
    return tradeItem(player, merchant, sold.id, true);
  }, /available/);
  const potion = merchant.backpack[0];
  tradeItem(player, merchant, potion.id, true);
  assert.equal(potion.quantity, 4);
  assert.equal(player.backpack[0].quantity, 1);
  const before = structuredClone({ player, merchant });
  assert.throws(() => {
    return tradeItem(player, merchant, potion.id, true);
  }, /gold/);
  assert.deepEqual({ player, merchant }, before);
});

test('buyback keeps the latest 20 sales separate, migrates legacy gear, and rejects expired IDs', () => {
  const player = hero();
  const merchant = freshMerchant();
  player.backpack = Array.from({ length: 24 }, () => {
    return item('loot-helmet');
  });
  const ids: string[] = [];
  // Trading mutates the backpack; iterate a snapshot so every original item is sold.
  // oxlint-disable-next-line unicorn/no-useless-spread
  for (const entry of [...player.backpack]) {
    tradeItem(player, merchant, entry.id, false);
    ids.push(merchant.buyback[0].id);
  }

  assert.equal(merchant.backpack.length, 2);
  assert.equal(merchant.buyback.length, BUYBACK_SLOTS);
  assert.deepEqual(
    merchant.buyback.map((entry) => {
      return entry.id;
    }),
    ids.slice(-20).reverse(),
  );
  assert.throws(() => {
    return tradeItem(player, merchant, ids[0], true);
  }, /available/);
  const legacy = merchantSchema.parse({
    coins: 100,
    backpack: [
      item('health-potion', 3),
      ...Array.from({ length: 20 }, () => {
        return item('loot-boots');
      }),
    ],
  });
  assert.equal(legacy.backpack.length, 1);
  assert.equal(legacy.backpack[0].quantity, 3);
  assert.equal(legacy.buyback.length, 20);
  assert.deepEqual(merchantSchema.parse(merchant), merchant);
  assert.equal(
    merchantSchema.safeParse({
      ...merchant,
      buyback: Array.from({ length: 21 }, () => {
        return item('loot-boots');
      }),
    }).success,
    false,
  );
});

test('sell all transfers stacks and gold atomically, preserves equipment and rejects unaffordable or overflowing sales', () => {
  const player = hero();
  const merchant = freshMerchant();
  const equipment = structuredClone(player.equipment);
  player.backpack = [item('loot-helmet'), item('health-potion', 5)];
  merchant.coins = 5;
  const before = structuredClone({ player, merchant });
  assert.throws(() => {
    return sellAll(player, merchant);
  }, /gold/);
  assert.deepEqual({ player, merchant }, before);
  merchant.coins = 5000;
  sellAll(player, merchant);
  assert.equal(player.coins, 6);
  assert.equal(merchant.coins, 4994);
  assert.equal(player.backpack.length, 0);
  assert.deepEqual(player.equipment, equipment);
  assert.deepEqual(
    merchant.buyback.map((entry) => {
      return entry.quantity;
    }),
    [5, 1],
  );
  tradeItem(player, merchant, merchant.buyback[0].id, true);
  assert.equal(player.backpack[0].quantity, 1);
  assert.equal(merchant.buyback[0].quantity, 4);
  player.coins = Number.MAX_SAFE_INTEGER;
  const overflow = structuredClone({ player, merchant });
  assert.throws(() => {
    return sellAll(player, merchant);
  }, /large/);
  assert.deepEqual({ player, merchant }, overflow);
});
