import { test } from 'node:test';
import assert from 'node:assert/strict';
import { softenArtTones } from '../packages/client/src/art-tones.ts';

test('dark outlines borrow the neighboring material color while alpha and empty pixels survive', () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 40, 160, 40, 255, 9, 8, 7, 0]);
  softenArtTones(pixels, 3, 1);
  assert.ok(pixels[1] > pixels[0]);
  assert.ok(pixels[1] > 30 && pixels[1] < 60);
  assert.equal(pixels[3], 255);
  assert.equal(pixels[7], 255);
  assert.deepEqual(Array.from(pixels.slice(8)), [9, 8, 7, 0]);
});

test('transparent neighbors cannot recolor a silhouette and partial alpha stays unchanged', () => {
  const pixels = new Uint8ClampedArray([255, 0, 255, 0, 10, 10, 10, 100]);
  softenArtTones(pixels, 2, 1);
  assert.deepEqual(Array.from(pixels.slice(4)), [16, 16, 16, 100]);
});

test('highlights receive only a small contrast reduction', () => {
  const pixels = new Uint8ClampedArray([255, 255, 255, 255]);
  softenArtTones(pixels, 1, 1);
  assert.deepEqual([...pixels], [251, 251, 251, 255]);
});
