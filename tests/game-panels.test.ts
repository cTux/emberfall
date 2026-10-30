import assert from 'node:assert/strict';
import test from 'node:test';
import { gamePanel } from '../packages/client/src/game-panels.ts';

test('talents remain nonmodal while building windows resolve their host title and dimensions', () => {
  assert.equal(gamePanel('talents', '', false).modal, false);
  assert.deepEqual(gamePanel('building', 'Marta', true), { title: 'Marta', width: 520 });
  assert.equal(gamePanel('building', 'Storehouse', false).width, 520);
  assert.equal(gamePanel('building', 'Hall', false).width, undefined);
});
