import { test, expect } from './fixtures';
import { starterEquipment } from '../packages/core/src/index.ts';

test.use({ graphicsPreset: 'High' });

test('player shadow masks sample complete high-resolution frames in every facing', async ({
  page,
  game,
}) => {
  await page.addInitScript(() => {
    const crops: number[][] = [];
    Object.assign(window, { shadowCrops: crops });
    // eslint-disable-next-line typescript/unbound-method -- Forward the original receiver with Reflect.apply.
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (
      source: CanvasImageSource,
      ...rect: number[]
    ) {
      if (
        source instanceof HTMLImageElement &&
        source.dataset.artResolution === '2' &&
        this.canvas.width === 64 &&
        this.canvas.height === 64 &&
        rect.length === 8
      )
        crops.push(rect);
      return Reflect.apply(drawImage, this, [source, ...rect]);
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 960, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-renderer', 'pixijs-webgl');
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  for (const classId of ['warrior', 'ranger', 'mage', 'druid'] as const) {
    player.classId = classId;
    player.equipment = starterEquipment(classId);
    for (const key of ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(350);
      await page.keyboard.up(key);
    }
    await page.screenshot({ path: `test-results/shadows-village-${classId}.png` });
  }
  const crops = await page.evaluate(
    () => (window as unknown as { shadowCrops: number[][] }).shadowCrops,
  );
  expect(crops.length).toBeGreaterThan(16);
  expect(crops.filter((rect) => rect[2] !== 128 || rect[3] !== 128)).toHaveLength(0);
  expect(errors).toEqual([]);
});
