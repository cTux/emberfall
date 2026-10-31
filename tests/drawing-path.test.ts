import assert from 'node:assert/strict';
import test from 'node:test';
import { DrawingPath } from '../packages/client/src/rendering/drawing-path.ts';

function recording() {
  const calls: { method: PropertyKey; parameters: unknown[] }[] = [];
  const graphics = new Proxy(
    {},
    {
      get(_target, method) {
        return (...parameters: unknown[]) => {
          calls.push({ method, parameters });
        };
      },
    },
  ) as Parameters<DrawingPath['draw']>[0];

  return { calls, graphics };
}

test('path handlers preserve named coordinates, curve controls and arc direction', () => {
  const path = new DrawingPath();
  const { calls, graphics } = recording();
  path.add('moveTo', 1, 2);
  path.add('lineTo', 3, 4);
  path.add('quadraticCurveTo', 5, 6, 7, 8);
  path.add('bezierCurveTo', 9, 10, 11, 12, 13, 14);
  path.add('arc', 15, 16, 17, 0.2, 0.8, true);
  path.add('closePath');
  assert.equal(path.draw(graphics, []), graphics);
  assert.deepEqual(calls, [
    { method: 'clear', parameters: [] },
    { method: 'moveTo', parameters: [1, 2] },
    { method: 'lineTo', parameters: [3, 4] },
    { method: 'quadraticCurveTo', parameters: [5, 6, 7, 8] },
    { method: 'bezierCurveTo', parameters: [9, 10, 11, 12, 13, 14] },
    { method: 'arc', parameters: [15, 16, 17, 0.2, 0.8, true] },
    { method: 'closePath', parameters: [] },
  ]);
  path.reset();
  calls.length = 0;
  path.draw(graphics, []);
  assert.deepEqual(calls, [{ method: 'clear', parameters: [] }]);
});

test('dashes continue across segments and restart at moveTo and each replay', () => {
  const path = new DrawingPath();
  const { calls, graphics } = recording();
  path.add('moveTo', 0, 0);
  path.add('lineTo', 3, 0);
  path.add('lineTo', 8, 0);
  path.add('moveTo', 10, 0);
  path.add('lineTo', 15, 0);
  path.add('lineTo', 15, 0);
  path.draw(graphics, [0, -1, 4, 2]);
  const expected = [
    { method: 'clear', parameters: [] },
    { method: 'moveTo', parameters: [0, 0] },
    { method: 'lineTo', parameters: [3, 0] },
    { method: 'lineTo', parameters: [4, 0] },
    { method: 'moveTo', parameters: [6, 0] },
    { method: 'lineTo', parameters: [8, 0] },
    { method: 'moveTo', parameters: [10, 0] },
    { method: 'lineTo', parameters: [14, 0] },
    { method: 'moveTo', parameters: [15, 0] },
  ];
  assert.deepEqual(calls, expected);
  calls.length = 0;
  path.draw(graphics, [4, 2]);
  assert.deepEqual(calls, expected);
});

test('ellipse handler preserves rotation and clockwise or counterclockwise sweep', () => {
  for (const counterclockwise of [false, true]) {
    const path = new DrawingPath();
    const { calls, graphics } = recording();
    path.add('ellipse', 10, 20, 8, 4, Math.PI / 2, 0, Math.PI / 2, counterclockwise);
    path.draw(graphics, []);
    assert.deepEqual(calls[1], { method: 'moveTo', parameters: [10, 28] });
    const last = calls.at(-1)!;
    assert.equal(last.method, 'lineTo');
    assert.ok(Math.abs(Number(last.parameters[0]) - 6) < 1e-10);
    assert.ok(Math.abs(Number(last.parameters[1]) - 20) < 1e-10);
    const next = calls[2].parameters;
    assert.equal(Number(next[0]) > 10, counterclockwise);
  }
});
