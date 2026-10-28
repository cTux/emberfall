import { test, expect } from './fixtures';
import { LOBBY_PORTAL } from '../packages/core/src/index.ts';

test('lobby portal navigation renders in the village and across a wrapped edge', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.getByLabel('Shared village. Move with WASD or arrow keys.');
  await expect(canvas).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  for (const [name, x] of [
    ['offscreen', 1800],
    ['wrapped', 4700],
    ['visible', LOBBY_PORTAL.x],
  ] as const) {
    player.x = x;
    player.y = LOBBY_PORTAL.y;
    await expect(canvas).toHaveAttribute('data-renderer', 'pixijs-webgl');
    await expect
      .poll(() =>
        canvas.evaluate(async (element) => {
          await new Promise(requestAnimationFrame);
          const source = element as HTMLCanvasElement;
          const sample = document.createElement('canvas');
          sample.width = source.width;
          sample.height = source.height;
          const context = sample.getContext('2d')!;
          context.drawImage(source, 0, 0);
          return [28, source.width - 28].map((x) => {
            const pixels = context.getImageData(x - 8, source.height / 2 - 8, 16, 16).data;
            let blue = 0;
            for (let i = 0; i < pixels.length; i += 4)
              if (pixels[i] > 80 && pixels[i] < 150 && pixels[i + 1] > 180 && pixels[i + 2] > 220)
                blue++;
            return blue > 10;
          });
        }),
      )
      .toEqual(
        name === 'offscreen' ? [true, false] : name === 'wrapped' ? [false, true] : [false, false],
      );
    await page.screenshot({ path: `test-results/portal-navigation-${name}.png` });
  }
  expect(errors).toEqual([]);
});
