import type { Locator, Page } from '@playwright/test';

export async function drag(page: Page, handle: Locator, dx: number, dy: number) {
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 20 + dx, box.y + 15 + dy, { steps: 5 });
  await page.mouse.up();
}
