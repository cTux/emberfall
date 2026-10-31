import { test, expect } from './fixtures';

test('class movement page shows every direction and supports gait inspection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/?class-movement');
  const canvas = page.getByLabel('All classes walking in four directions');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  const first = await canvas.getAttribute('data-frame');
  await expect
    .poll(() => {
      return canvas.getAttribute('data-frame');
    })
    .not.toBe(first);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByLabel('Travel', { exact: true }).uncheck();
  await expect(canvas).toHaveAttribute('data-travel', 'false');
  const pausedFrame = await canvas.getAttribute('data-frame');
  await page.waitForTimeout(160);
  await expect(canvas).toHaveAttribute('data-frame', pausedFrame!);
  const seen = new Set<string>();
  for (let frame = 0; frame < 6; frame++) {
    const previous = await canvas.getAttribute('data-frame');
    await page.getByRole('button', { name: 'Next frame' }).click();
    await expect
      .poll(() => {
        return canvas.getAttribute('data-frame');
      })
      .not.toBe(previous);
    seen.add((await canvas.getAttribute('data-frame'))!);
    await canvas.screenshot({ path: `test-results/class-movement-${frame}.png` });
  }

  expect(seen.size).toBe(6);
  await page.getByLabel('Speed', { exact: true }).selectOption('0.5');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByLabel('Travel', { exact: true }).check();
  await expect(canvas).toHaveAttribute('data-travel', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/class-movement-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
