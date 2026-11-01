import assert from 'node:assert/strict';
import test from 'node:test';
import { browserCrypto } from 'random-js';
import { randomSource } from '../../random.ts';

test('gameplay draws use Web Crypto without Math.random', (t) => {
  t.mock.method(Math, 'random', () => {
    throw new Error('gameplay must not use Math.random');
  });
  const entropy = t.mock.method(crypto, 'getRandomValues');

  // Exceed the engine's 128-word buffer to verify entropy refills as well as initial draws.
  for (let draw = 0; draw < 256; draw++) {
    const value = randomSource.next();
    assert(value >= 0 && value < 1);
  }

  assert(entropy.mock.callCount() > 1);
});

test('gameplay draws include zero and exclude one at the engine boundaries', (t) => {
  const next = t.mock.method(browserCrypto, 'next', () => {
    return 0;
  });
  assert.equal(randomSource.next(), 0);
  next.mock.mockImplementation(() => {
    return -1;
  });
  assert.equal(randomSource.next(), 1 - Number.EPSILON / 2);
});
