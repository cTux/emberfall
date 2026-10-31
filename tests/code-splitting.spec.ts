import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

const manifest: Record<string, { file: string }> = JSON.parse(
  readFileSync('packages/client/dist/.vite/manifest.json', 'utf8'),
);
const chunk = (name: string) => {
  return manifest[`src/${name}.tsx`].file;
};

const optional = [
  'Arena',
  'WeaponActionBar',
  'Settings',
  'Codex',
  'Talents',
  'equipment-view',
  'Storehouse',
  'AssetGallery',
  'ClassMovementGallery',
];

test('account gate renders before account access and game code waits for access', async ({
  page,
}) => {
  await page.route('**/api/account', async (route) => {
    await route.fulfill({
      json: { mode: 'steam', authenticated: false, nickname: null, steamName: '' },
    });
  });
  const requests: string[] = [];
  page.on('request', (request) => {
    return requests.push(new URL(request.url()).pathname);
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Sign in through Steam' })).toBeVisible();
  for (const name of ['Game', ...optional]) {
    expect(
      requests.some((path) => {
        return path.endsWith(chunk(name));
      }),
      name,
    ).toBe(false);
  }
});

test('world browser defers rendering and panels load only when opened', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    return requests.push(new URL(request.url()).pathname);
  });
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'World server online' })).toBeVisible();
  for (const name of optional) {
    expect(
      requests.some((path) => {
        return path.endsWith(chunk(name));
      }),
      name,
    ).toBe(false);
  }

  expect(
    requests.filter((path) => {
      return path.includes('/assets/wardrobe-style/');
    }),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Graphics', exact: true })).toBeVisible();
  expect(
    requests.some((path) => {
      return path.endsWith(chunk('Settings'));
    }),
  ).toBe(true);
  expect(
    requests.some((path) => {
      return path.endsWith(chunk('Arena'));
    }),
  ).toBe(false);
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await page.getByRole('button', { name: 'Codex', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toBeVisible();
  expect(
    requests.some((path) => {
      return path.endsWith(chunk('Codex'));
    }),
  ).toBe(true);
  await page.getByRole('button', { name: 'Close Codex' }).click();
  await page.getByRole('button', { name: /Playtest Default.*0\/32/ }).click();
  await expect(page.locator('canvas[data-renderer]')).toBeVisible();
  expect(
    requests.some((path) => {
      return path.endsWith(chunk('Arena'));
    }),
  ).toBe(true);
  expect(
    requests.some((path) => {
      return path.endsWith(chunk('WeaponActionBar'));
    }),
  ).toBe(true);
  expect(
    requests.some((path) => {
      return path.endsWith(chunk('Talents'));
    }),
  ).toBe(false);
  await page.getByRole('button', { name: 'Talents', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Talents', exact: true })).toBeVisible();
  await expect
    .poll(() => {
      return requests.some((path) => {
        return path.endsWith(chunk('Talents'));
      });
    })
    .toBe(true);
  await page.getByRole('button', { name: 'Close Talents' }).click();
  await page.screenshot({ path: 'test-results/code-splitting-village.png' });
  expect(errors).toEqual([]);
});

test('a slow or failed panel chunk leaves its window closable and the lobby usable', async ({
  page,
}) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/${chunk('Settings')}`, async (route) => {
    await blocked;
    await route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toHaveCSS(
    'clip-path',
    'inset(50%)',
  );
  await page.screenshot({ path: 'test-results/quiet-loading-panel.png' });
  await expect(page.getByRole('button', { name: 'Close Settings' })).toBeVisible();
  release();
  await expect(page.getByRole('log')).toContainText('System: Could not load this content');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Codex', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toBeVisible();
});

for (const [query, selected, other] of [
  ['art-gallery', 'AssetGallery', 'ClassMovementGallery'],
  ['class-movement', 'ClassMovementGallery', 'AssetGallery'],
]) {
  test(`${query} loads its gallery without the game or other gallery`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      return requests.push(new URL(request.url()).pathname);
    });
    await page.goto(`/?${query}`);
    await expect
      .poll(() => {
        return requests.some((path) => {
          return path.endsWith(chunk(selected));
        });
      })
      .toBe(true);
    await expect(page.locator('canvas').first()).toBeVisible();
    for (const name of ['Game', 'Arena', other]) {
      expect(
        requests.some((path) => {
          return path.endsWith(chunk(name));
        }),
        name,
      ).toBe(false);
    }
  });
}
