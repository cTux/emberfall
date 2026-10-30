import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemComparison } from '../packages/client/src/item-comparison.ts';

const item = { id: 'new', itemId: 'loot-amulet', quantity: 1, stats: { expIncrease: 20 } };

test('weapon comparison uses only the active range and never exposes attack-speed rows', () => {
  const weapon = { id: 'staff', itemId: 'mage-staff', quantity: 1 };
  for (const autoTarget of [true, false]) {
    const rows = itemComparison(weapon, { classId: 'mage', equipment: {}, autoTarget })!.rows;
    assert.equal(rows.filter((row) => row.label === 'Range').length, 1);
    assert.equal(rows.find((row) => row.label === 'Range')?.value, autoTarget ? '+250' : '+1,000');
    assert(!rows.some((row) => /second|manual/i.test(row.label)));
  }
});

test('item comparison includes gained and lost bonuses without unchanged base stats', () => {
  const comparison = itemComparison(item, {
    equipment: { amulet: 'loot-amulet' },
    equipmentItems: {
      amulet: { id: 'old', itemId: 'loot-amulet', quantity: 1, stats: { goldIncrease: 10 } },
    },
  });
  assert.deepEqual(comparison, {
    label: 'vs equipped Amulet',
    rows: [
      { label: 'Exp increase', value: '+20%', improved: true },
      { label: 'Gold increase', value: '-10%', improved: false },
    ],
  });
});

test('empty slots, equal stats and flat bonuses retain their units', () => {
  assert.deepEqual(
    itemComparison({ ...item, stats: { armor: 2, moreProjectiles: 1 } }, { equipment: {} })?.rows,
    [
      { label: 'Armor', value: '+1', improved: true },
      { label: 'Armor', value: '+2', improved: true },
      { label: 'More projectiles', value: '+1', improved: true },
    ],
  );
  assert.deepEqual(
    itemComparison(item, { equipment: { amulet: item.itemId }, equipmentItems: { amulet: item } })
      ?.rows,
    [],
  );
});

test('resources and incompatible weapons have no comparison; stale instances are ignored', () => {
  assert.equal(itemComparison({ ...item, itemId: 'empty-bottle' }, {}), undefined);
  assert.equal(
    itemComparison({ ...item, itemId: 'mage-staff' }, { classId: 'warrior' }),
    undefined,
  );
  assert.equal(
    itemComparison(item, {
      equipment: { amulet: 'loot-amulet' },
      equipmentItems: { amulet: { ...item, itemId: 'loot-ring', stats: { goldIncrease: 99 } } },
    })?.rows.length,
    1,
  );
});
