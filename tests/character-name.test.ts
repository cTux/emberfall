import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawCharacterName,
  drawPlayerHealth,
  drawChatBubble,
} from '../packages/client/src/effects.ts';

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

test('an active character name adds the interaction background and E prompt', () => {
  const active = recordingContext();
  drawCharacterName(active.ctx, 100, 161, 'Marta', undefined, true);
  assert.deepEqual(active.backgrounds, [['#786747', 76, 159, 48, 13]]);
  assert.deepEqual(active.text, [
    ['outline', '(E) Marta', 100, 167, '#101817', 2, 'round'],
    [
      'text',
      '(E) Marta',
      100,
      167,
      '8px "Alegreya Sans", sans-serif',
      'center',
      'alphabetic',
      '#ffffff',
    ],
  ]);
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
