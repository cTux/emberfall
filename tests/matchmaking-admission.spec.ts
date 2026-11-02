import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createGameServer } from '../packages/server/src/worlds.ts';
import { steamCallback, steamRequest } from '../packages/server/src/testing/steam.ts';

test('Steam SDK admission survives reload and logout after pre-allocation authentication', async ({
  page,
  baseURL,
}) => {
  const app = await createGameServer(
    resolve('packages/client/dist'),
    ':memory:',
    {
      cert: readFileSync('.certs/localhost.pem'),
      key: readFileSync('.certs/localhost-key.pem'),
    },
    { origin: baseURL!, apiKey: 'test', request: steamRequest },
  );
  await app.listen(Number(new URL(baseURL!).port));
  try {
    await page.route('**/auth/steam', async (route) => {
      const response = await route.fetch({ maxRedirects: 0 });
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          location: steamCallback(response.headers()['location']).toString(),
        },
      });
    });
    await page.goto('/');
    await page.getByRole('link', { name: 'Sign in through Steam' }).click();
    await page.getByRole('textbox', { name: 'Nickname' }).fill('Hero');
    await page.getByRole('button', { name: 'Save nickname', exact: true }).click();
    await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
    await expect(page.locator('.party')).toContainText('Hero');
    await page.reload();
    await expect(page.locator('.party')).toContainText('Hero');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Account', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out of Steam account' }).click();
    await expect(page.getByRole('link', { name: 'Sign in through Steam' })).toBeVisible();
  } finally {
    await app.close();
  }
});
