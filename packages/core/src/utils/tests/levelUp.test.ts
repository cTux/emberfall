import assert from 'node:assert/strict';
import test from 'node:test';
import { levelUp } from '../../index.ts';

test('levelUp returns a fresh object without changing the input', () => {
  const input = Object.freeze({ level: 1, experience: 49 });
  const result = levelUp(input);
  assert.deepEqual(result, { level: 1, experience: 49, paragon: 0 });
  assert.notEqual(result, input);
});

test('levelUp spends exponentially growing requirements and retains leftover XP', () => {
  assert.deepEqual(levelUp({ level: 1, experience: 50 }), { level: 2, experience: 0, paragon: 0 });
  assert.deepEqual(levelUp({ level: 2, experience: 99 }), { level: 2, experience: 99, paragon: 0 });
  assert.deepEqual(levelUp({ level: 2, experience: 100 }), { level: 3, experience: 0, paragon: 0 });
  assert.deepEqual(levelUp({ level: 1, experience: 350.5 }), {
    level: 4,
    experience: 0.5,
    paragon: 0,
  });
});

test('levelUp stops at level 20 and preserves unspent XP', () => {
  const totalRequired = 50 * (2 ** 19 - 1);
  assert.deepEqual(levelUp({ level: 1, experience: totalRequired - 1 }), {
    level: 19,
    experience: 50 * 2 ** 18 - 1,
    paragon: 0,
  });
  assert.deepEqual(levelUp({ level: 1, experience: totalRequired }), {
    level: 20,
    experience: 0,
    paragon: 0,
  });
  assert.deepEqual(levelUp({ level: 1, experience: totalRequired + 75 }), {
    level: 20,
    experience: 75,
    paragon: 0,
  });
  assert.deepEqual(levelUp({ level: 20, experience: 100 }), {
    level: 20,
    experience: 100,
    paragon: 0,
  });
});

test('levelUp crosses the normal cap into multiple paragon levels', () => {
  const totalRequired = 50 * (2 ** 21 - 1);
  assert.deepEqual(levelUp({ level: 1, experience: totalRequired + 0.5 }), {
    level: 20,
    experience: 0.5,
    paragon: 2,
  });
});

test('levelUp continues from an existing paragon level without mutating the input', () => {
  const requiredExperience = 50 * 2 ** 22;
  const input = Object.freeze({ level: 20, experience: requiredExperience - 1, paragon: 3 });
  const result = levelUp(input);
  assert.deepEqual(result, input);
  assert.notEqual(result, input);
  assert.deepEqual(levelUp({ ...input, experience: requiredExperience }), {
    level: 20,
    experience: 0,
    paragon: 4,
  });
});
