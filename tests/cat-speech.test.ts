import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CatSpeech } from '../packages/client/src/cat-speech.ts';
import { crittersAt } from '../packages/client/src/critter-motion.ts';

test('cats respond immediately, ignore repeated pets and respond again at exactly two seconds', () => {
  const speech = new CatSpeech();
  assert.equal(speech.pet('cat:a', 0), 'Purrr');
  assert.equal(speech.message('cat:a', 0), 'Purrr');
  assert.equal(speech.pet('cat:a', 1999), undefined);
  assert.equal(speech.message('cat:a', 1999), 'Purrr');
  assert.equal(speech.message('cat:a', 2000), undefined);
  speech.pet('cat:a', 2000);
  assert.equal(speech.message('cat:a', 2000), 'Meow');
  speech.pet('cat:b', 2001);
  assert.equal(speech.message('cat:b', 2001), 'Purrr');
  assert.equal(speech.message('cat:a', 4000), undefined);
  speech.pet('cat:a', 4000);
  assert.equal(speech.message('cat:a', 4000), 'Mrrp');
});

test('cat identities survive motion and wrapped camera projection', () => {
  const bounds = { x: 0, y: 0, width: 960, height: 640 };
  const first = crittersAt('village', 0, bounds).filter((c) => {
    return c.kind === 'cat';
  });
  const moved = crittersAt('village', 2000, { ...bounds, x: 4800 });
  for (const cat of first) {
    const copy = moved.find((c) => {
      return c.id === cat.id;
    });
    assert.ok(copy);
    assert.equal(copy.y, cat.y);
    assert.ok(Math.abs(copy.x - 4800 - cat.x) <= 40);
  }
});

test('cat replies vary, start with capitals and cycle without consecutive repeats', () => {
  const speech = new CatSpeech();
  const lines = Array.from({ length: 6 }, (_, index) => {
    return speech.pet('cat:a', index * 2000);
  });
  assert.equal(new Set(lines).size, 6);
  for (const line of lines) {
    assert.match(line!, /^[A-Z]/);
  }

  assert.equal(speech.pet('cat:a', 12000), lines[0]);
});
