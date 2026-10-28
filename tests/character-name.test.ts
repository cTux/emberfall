import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawCharacterName,
  drawPlayerHealth,
  drawNameBadge,
  drawChatBubble,
} from '../packages/client/src/effects.ts';
import { drawWorldBar } from '../packages/client/src/world-bar.ts';
import { drawTimedActivity } from '../packages/client/src/timed-activity.ts';

function recordingContext() {
  const text: unknown[] = [];
  const backgrounds: unknown[] = [];
  const context = {
    font: '',
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    measureText(value: string) {
      return { width: value.length * 4, actualBoundingBoxAscent: 6 };
    },
    fillRect(...rect: number[]) {
      backgrounds.push([this.fillStyle, ...rect]);
    },
    strokeText(value: string, x: number, y: number) {
      text.push(['outline', value, x, y, this.strokeStyle, this.lineWidth, this.lineJoin]);
    },
    fillText(value: string, x: number, y: number) {
      text.push([
        'text',
        value,
        x,
        y,
        this.font,
        this.textAlign,
        this.textBaseline,
        this.fillStyle,
      ]);
    },
  };
  return { ctx: context as unknown as CanvasRenderingContext2D, text, backgrounds };
}

test('character names match player labels at the same offset above their sprites', () => {
  const player = recordingContext();
  const innkeeper = recordingContext();
  drawPlayerHealth(player.ctx, 100, 200 - 46, 10, 10, 'Marta');
  // The player sprite starts at y - 30; Marta's scenery sprite is foot-anchored.
  drawCharacterName(innkeeper.ctx, 100, 218 - 48 - 9, 'Marta');
  assert.deepEqual(innkeeper.text, player.text);
  assert.deepEqual(innkeeper.backgrounds, []);
});

test('overhead player and boss health match gathering thickness and borders without moving names', () => {
  const gathering = recordingContext();
  drawTimedActivity(
    gathering.ctx,
    { startedAt: 0, endsAt: 5000, durationMs: 5000, zoneStart: 0.7, zoneAt: 0, checkId: 'zone' },
    100,
    98,
    2500,
  );
  const frame = gathering.backgrounds.slice(0, 3) as [string, number, number, number, number][];
  assert.deepEqual(gathering.text, []);
  assert.deepEqual(frame, [
    ['#28271b', 38, 100, 124, 7],
    ['#695a31', 39, 101, 122, 5],
    ['#ebc34b', 39, 101, 61, 5],
  ]);
  for (const boss of [false, true]) {
    const health = recordingContext();
    const width = drawPlayerHealth(
      health.ctx,
      100,
      boss ? 98 : 100,
      50,
      100,
      'Hero',
      '#ffffff',
      boss,
    );
    assert.equal(width, boss ? 64 : 40);
    const rectangles = health.backgrounds as [string, number, number, number, number][];
    assert.deepEqual(rectangles, [
      ['#28271b', 100 - width / 2, 100, width, 7],
      ['#695a31', 101 - width / 2, 101, width - 2, 5],
      [boss ? '#c084fc' : '#86d9a2', 101 - width / 2, 101, (width - 2) / 2, 5],
    ]);
    assert.equal((health.text[0] as unknown[])[3], 113);
  }
});

test('world bar fills clamp at empty and full while preserving the frame', () => {
  for (const [fraction, expectedWidth] of [
    [-1, 0],
    [0, 0],
    [0.5, 19],
    [1, 38],
    [2, 38],
  ]) {
    const context = recordingContext();
    drawWorldBar(context.ctx, 10, 30, 40, fraction, '#df7765');
    assert.deepEqual(context.backgrounds, [
      ['#28271b', 10, 23, 40, 7],
      ['#695a31', 11, 24, 38, 5],
      ['#df7765', 11, 24, expectedWidth, 5],
    ]);
  }
});

test('character names and building badges keep their normal text and backgrounds', () => {
  const name = recordingContext();
  drawCharacterName(name.ctx, 100, 161, 'Marta');
  assert.deepEqual(name.backgrounds, []);
  assert.equal((name.text[0] as unknown[])[1], 'Marta');
  const badge = recordingContext();
  drawNameBadge(badge.ctx, 100, 200, 'Hall');
  assert.deepEqual(badge.backgrounds, [['#302d20', 86, 180, 28, 13]]);
  assert.equal((badge.text[0] as unknown[])[1], 'Hall');
});

test('speech bubbles wrap whole words and keep oversized words intact', () => {
  const sentence = 'Welcome! Have you met our neighbours?';
  const bubble = recordingContext();
  bubble.ctx.measureText = (value: string) => ({ width: value.length * 7 }) as TextMetrics;
  drawChatBubble(bubble.ctx, 100, 200, sentence);
  const lines = bubble.text.map((entry) => (entry as unknown[])[1]);
  assert.deepEqual(lines, ['Welcome! Have you met our', 'neighbours?']);
  assert.equal(lines.join(' '), sentence);

  const oversized = recordingContext();
  const word = 'a'.repeat(60);
  drawChatBubble(oversized.ctx, 100, 200, `${word} hello`);
  assert.deepEqual(
    oversized.text.map((entry) => (entry as unknown[])[1]),
    [word, 'hello'],
  );
});
