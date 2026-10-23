import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CatSpeech } from '../packages/client/src/cat-speech.ts';
import { crittersAt } from '../packages/client/src/critter-motion.ts';

test('cats respond immediately, ignore repeated pets and respond again at exactly two seconds', () => {
  const speech = new CatSpeech();
  speech.pet('cat:a', 0);
  assert.equal(speech.message('cat:a', 0), 'purrr');
  speech.pet('cat:a', 1999);
  assert.equal(speech.message('cat:a', 1999), 'purrr');
  assert.equal(speech.message('cat:a', 2000), undefined);
  speech.pet('cat:a', 2000);
  assert.equal(speech.message('cat:a', 2000), 'meow');
  speech.pet('cat:b', 2001);
  assert.equal(speech.message('cat:b', 2001), 'purrr');
  assert.equal(speech.message('cat:a', 4000), undefined);
  speech.pet('cat:a', 4000);
  assert.equal(speech.message('cat:a', 4000), 'purrr');
});

test('cat identities survive motion and wrapped camera projection', () => {
  const bounds = { x: 0, y: 0, width: 960, height: 640 };
  const first = crittersAt('village', 0, bounds).filter((c) => c.kind === 'cat');
  const moved = crittersAt('village', 2000, { ...bounds, x: 4800 });
  for (const cat of first) {
    const copy = moved.find((c) => c.id === cat.id);
    assert.ok(copy);
    assert.equal(copy.y, cat.y);
    assert.ok(Math.abs(copy.x - 4800 - cat.x) <= 40);
  }
});
