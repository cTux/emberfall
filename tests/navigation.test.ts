import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOREST, LOBBY_PORTAL } from '../packages/core/src/index.ts';
import { drawNavigation } from '../packages/client/src/navigation.ts';
import type { WorldState } from '../packages/common/src/index.ts';

test('portal navigation shares off-screen suppression, wrapped direction and forest targets', (t) => {
  const originalPoint = Object.getOwnPropertyDescriptor(globalThis, 'DOMPoint');
  Object.defineProperty(globalThis, 'DOMPoint', {
    configurable: true,
    value: class {
      x: number;
      y: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }

      matrixTransform(matrix: { e: number; f: number }) {
        return { x: this.x + matrix.e, y: this.y + matrix.f };
      }
    },
  });
  t.after(() => {
    if (originalPoint) Object.defineProperty(globalThis, 'DOMPoint', originalPoint);
    else Reflect.deleteProperty(globalThis, 'DOMPoint');
  });
  const player = { id: 'me', x: 1800, y: LOBBY_PORTAL.y, hitpoints: 100 };
  const world = { players: [player] } as WorldState;
  const labels: string[] = [];
  const angles: number[] = [];
  const colors: string[] = [];
  let arrowX = 0;
  let arrowY = 0;
  let labelBox = { x: 0, y: 0, width: 0, height: 0 };
  const context = {
    canvas: { width: 800, height: 600, clientWidth: 800, clientHeight: 600 },
    getTransform: () => ({ e: 400 - player.x, f: 300 - player.y }),
    save() {},
    restore() {},
    setTransform() {},
    translate(x: number, y: number) {
      arrowX = x;
      arrowY = y;
    },
    rotate: (angle: number) => angles.push(angle),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    stroke() {},
    fill() {
      colors.push(this.fillStyle);
    },
    fillStyle: '',
    fillRect(x: number, y: number, width: number, height: number) {
      labelBox = { x, y, width, height };
    },
    measureText: () => ({ width: 70 }),
    fillText: (label: string) => labels.push(label),
  };
  const draw = () => {
    labels.length = angles.length = colors.length = 0;
    drawNavigation(context as unknown as CanvasRenderingContext2D, world, 'me');
  };

  draw();
  assert.deepEqual(labels, ['Forest portal']);
  assert.deepEqual(colors, ['#70d8ff']);
  assert.equal(Math.abs(angles[0]), Math.PI);

  player.x = LOBBY_PORTAL.x;
  draw();
  assert.deepEqual(labels, []);

  player.x = FOREST.width - 100;
  draw();
  assert.deepEqual(labels, ['Forest portal']);
  assert.equal(angles[0], 0);

  for (let degrees = 0; degrees < 360; degrees += 5) {
    const angle = (degrees * Math.PI) / 180;
    player.x = LOBBY_PORTAL.x - Math.cos(angle) * 1500;
    player.y = LOBBY_PORTAL.y - Math.sin(angle) * 1500;
    draw();
    assert.equal(labels.length, 1);
    assert.ok(
      labelBox.x > arrowX + 14 ||
        labelBox.x + labelBox.width < arrowX - 14 ||
        labelBox.y > arrowY + 14 ||
        labelBox.y + labelBox.height < arrowY - 14,
      `label overlaps arrow at ${degrees} degrees`,
    );
    assert.ok(labelBox.x >= 5 && labelBox.x + labelBox.width <= 795);
    assert.ok(labelBox.y >= 0 && labelBox.y + labelBox.height <= 600);
  }

  player.x = FOREST.width - 100;
  player.y = LOBBY_PORTAL.y;

  world.players[0].scene = 'forest';
  draw();
  assert.deepEqual(labels, []);
  world.scene = {
    phase: 'active',
    enemies: [{ kind: 'boss', hitpoints: 100, x: LOBBY_PORTAL.x, y: player.y }],
    portals: [],
  } as unknown as WorldState['scene'];
  draw();
  assert.deepEqual(labels, ['The Hollow Warden']);
  world.scene!.enemies[0].hitpoints = 0;
  world.scene!.phase = 'ended';
  world.scene!.portals = [{ ...LOBBY_PORTAL }];
  draw();
  assert.deepEqual(labels, ['Return portal']);
});
