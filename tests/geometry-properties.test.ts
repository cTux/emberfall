import assert from 'node:assert/strict';
import { test } from 'node:test';
import fc from 'fast-check';
import { wrap, wrappedDelta } from '../packages/common/src/index.ts';

// Bounded integers keep arithmetic exact while covering many world seams.
const coordinate = fc.integer({ min: -1_000_000, max: 1_000_000 });
const worldSize = fc.integer({ min: 1, max: 10_000 });

test('wrapping stays inside the world and is unchanged by whole-world translations', () => {
  fc.assert(
    fc.property(
      coordinate,
      worldSize,
      fc.integer({ min: -100, max: 100 }),
      (value, size, turns) => {
        const wrapped = wrap(value, size);
        assert(wrapped >= 0 && wrapped < size);
        assert.equal(wrap(wrapped, size), wrapped);
        assert.equal(wrap(value + turns * size, size), wrapped);
      },
    ),
    { numRuns: 200 },
  );
});

test('wrapped displacement reaches the same point by a shortest route', () => {
  fc.assert(
    fc.property(coordinate, coordinate, worldSize, (a, b, size) => {
      const delta = wrappedDelta(a, b, size);
      assert(delta >= -size / 2 && delta < size / 2);
      assert.equal(wrap(b + delta, size), wrap(a, size));

      // Compare nearby routes independently instead of repeating the modulo implementation.
      for (const turns of [-1, 0, 1]) {
        const route = wrap(a, size) - wrap(b, size) + turns * size;
        assert(Math.abs(delta) <= Math.abs(route));
      }
    }),
    { numRuns: 200 },
  );
});

test('opposite wrapped displacements cancel except at the half-world tie', () => {
  fc.assert(
    fc.property(coordinate, coordinate, worldSize, (a, b, size) => {
      const forward = wrappedDelta(a, b, size);
      const backward = wrappedDelta(b, a, size);

      if (Math.abs(forward) === size / 2) {
        assert.equal(forward, -size / 2);
        assert.equal(backward, -size / 2);
      } else {
        assert.equal(forward + backward, 0);
      }
    }),
    { numRuns: 200 },
  );
});
