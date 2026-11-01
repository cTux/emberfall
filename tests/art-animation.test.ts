import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actorFrame,
  enemyFrame,
  playerFrame,
  enemyReleasedAt,
} from '../packages/client/src/animation.ts';
import { movementFacing } from '../packages/client/src/facing.ts';

test('action frames follow timestamps, do not animate future actions, and death wins', () => {
  assert.equal(actorFrame(999, false, true, 1000), 0);
  assert.equal(actorFrame(1000, true, true, 1000), 5);
  assert.equal(actorFrame(1104, true, true, 1000), 6);
  assert.equal(actorFrame(1260, false, true, 1000), 0);
  assert.equal(actorFrame(1100, true, false, 1000), 7);
  assert.deepEqual(
    [0, 120, 240, 360, 480].map((time) => {
      return actorFrame(time, true, true);
    }),
    [1, 2, 3, 4, 1],
  );
});

test('players use all six gait poses without changing action timing or left facing', () => {
  assert.deepEqual(
    [0, 80, 160, 240, 320, 400, 480].map((time) => {
      return playerFrame(time, true, true);
    }),
    [1, 2, 3, 4, 8, 9, 1],
  );

  for (const time of [999, 1000, 1104, 1260]) {
    assert.equal(playerFrame(time, false, true, 1000), actorFrame(time, false, true, 1000));
  }

  assert.equal(playerFrame(1100, true, false, 1000), 7);
  assert.equal(movementFacing(-1, 0, 3), 2);
  assert.equal(movementFacing(1, 0, 2), 3);
});

test('enemy windup, release and locomotion use existing confirmed times', () => {
  const attack = { startedAt: 1000, endsAt: 1650 };
  assert.equal(enemyFrame(999, false, true, attack), 0);
  assert.equal(enemyFrame(1400, true, true, attack), 5);
  assert.equal(enemyFrame(1650, false, true, undefined, 1650), 6);
  assert.equal(enemyFrame(1830, false, true, undefined, 1650), 0);
  assert.equal(enemyFrame(1400, true, false, attack), 7);
});

test('dimension attack speeds retain the full confirmed enemy release pose', () => {
  for (const speed of [1, 1.2, 1.4]) {
    const releasedAt = enemyReleasedAt(2000 + 1600 / speed, 1600, speed);
    assert.equal(enemyFrame(2001, false, true, undefined, releasedAt), 6);
    assert.equal(enemyFrame(2179, false, true, undefined, releasedAt), 6);
    assert.equal(enemyFrame(2181, false, true, undefined, releasedAt), 0);
    assert.equal(enemyFrame(1999, false, true, undefined, releasedAt), 0);
  }
});
