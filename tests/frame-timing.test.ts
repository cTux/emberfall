import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleFrameTiming } from './frame-timing.ts';

function clock(interval: number) {
  let now = 0;
  let sequence = 0;

  return (callback: (now: number) => void) => {
    const at = now;
    now += interval;
    queueMicrotask(() => {
      return callback(at);
    });

    return ++sequence;
  };
}

test('slow frames extend sampling while retaining actual duration and frame intervals', async () => {
  assert.deepEqual(
    await sampleFrameTiming(
      clock(600),
      () => {
        return 0;
      },
      () => {},
    ),
    {
      frames: 6,
      averageMs: 600,
      p95Ms: 600,
      sampleMs: 3600,
    },
  );
});

test('the sampling deadline preserves an insufficient-frame result instead of hiding stalls', async () => {
  assert.deepEqual(
    await sampleFrameTiming(
      clock(3000),
      () => {
        return 0;
      },
      () => {},
    ),
    {
      frames: 5,
      averageMs: 3000,
      p95Ms: 3000,
      sampleMs: 15000,
    },
  );
});

test('sampling resolves with failure evidence and cancels a frame when callbacks stop', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 });
  const cancelled: number[] = [];
  const sample = sampleFrameTiming(
    () => {
      return 17;
    },
    () => {
      return Date.now();
    },
    (id) => {
      return cancelled.push(id);
    },
  );
  context.mock.timers.tick(15000);
  assert.deepEqual(await sample, { frames: 0, averageMs: 0, p95Ms: 0, sampleMs: 15000 });
  assert.deepEqual(cancelled, [17]);
});
