import { test, expect } from './fixtures';

test('Codex chapters have formatted content and loaded artwork without resizing', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Codex reader');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Codex', exact: true }).click();
    const codex = page.getByRole('dialog', { name: 'Codex', exact: true });
    const initial = (await codex.boundingBox())!;
    expect(initial.height).toBe(Math.min(480, viewport.height - 32));
    expect(initial.y).toBeGreaterThanOrEqual(16);
    expect(initial.y + initial.height).toBeLessThanOrEqual(viewport.height - 16);
    const tabs = codex.getByRole('tab');
    for (const tab of await tabs.all()) {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      expect(await codex.boundingBox()).toEqual(initial);
      const panel = codex.getByRole('tabpanel');
      expect(await panel.getByRole('heading', { level: 4 }).count()).toBeGreaterThan(0);
      const images = panel.getByRole('img');
      expect(await images.count()).toBeGreaterThan(0);
      for (const image of await images.all()) {
        await expect(image).toHaveAttribute('alt', /\S/);
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `test-results/codex-${viewport.width}-${await tab.textContent()}.png`,
      });
    }
    await tabs.last().focus();
    await page.keyboard.press('Home');
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    const content = codex.locator('.MuiDialogContent-root');
    expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
    await content.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(codex.getByRole('link', { name: 'CC BY 3.0', exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/codex-${viewport.width}.png` });
    await page.keyboard.press('Escape');
    await expect(codex).not.toBeVisible();
  }
});
