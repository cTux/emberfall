import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorldPasswords } from './runtime/passwords.ts';

test('world password work tracks concurrent hashes and releases the runtime budget', async () => {
  const passwords = createWorldPasswords();
  const first = passwords.hash('password', 'salt');
  const second = passwords.hash('password', 'salt');
  assert.equal(passwords.pending, 2);
  const hashes = await Promise.all([first, second]);
  assert.equal(passwords.pending, 0);
  assert.equal(hashes[0].length, 32);
  assert.deepEqual(hashes[0], hashes[1]);
});
