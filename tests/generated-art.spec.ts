import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { game as catalog, PLANT_KINDS } from '../packages/core/src/index.ts';
import type { ResourceNode } from '../packages/core/src/gathering.ts';
import { itemArtName } from '../packages/client/src/class-art.ts';

test('all bundled items render dedicated artwork in inventory', async ({ page, game }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.backpack = catalog.registries.items
    .values()
    .map((item) => ({ id: item.id, itemId: item.id, quantity: 1 }));
  await page.getByRole('button', { name: 'Inventory' }).click();
  const backpack = page.getByRole('region', { name: 'Your backpack' });
  const plants = new Set<string>(['plant', ...PLANT_KINDS]);
  for (const item of catalog.registries.items.values()) {
    const button = backpack.getByRole('button', { name: `Use ${item.name}`, exact: true });
    await expect(button).toBeVisible();
    if (plants.has(item.id)) {
      await expect(button.locator('canvas')).toBeVisible();
    } else {
      const image = button.locator('img');
      await expect(image).toHaveAttribute(
        'src',
        `/assets/wardrobe-style/${itemArtName(item.id)}.png`,
      );
      await expect
        .poll(() => image.evaluate((image: HTMLImageElement) => image.naturalWidth))
        .toBe(96);
    }
  }
  await page.screenshot({ path: 'test-results/all-item-artwork.png' });
});

test('resource states keep distinct artwork and matching sun and lamp shadow silhouettes', async ({
  page,
}) => {
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    root: resolve('packages/client'),
    logLevel: 'error',
    build: {
      write: false,
      lib: {
        entry: resolve('tests/village-scenery-fixture.ts'),
        name: 'VillageScenery',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.goto('/?art-gallery');
  await page.addScriptTag({ content: code });
  const result = await page.evaluate(
    async (plantKinds) => {
      const fixture = (
        window as unknown as { VillageScenery: typeof import('./village-scenery-fixture') }
      ).VillageScenery;
      while (
        fixture.artImages.some((image) => !image.complete || image.dataset.artReady !== 'true')
      )
        await new Promise((done) => setTimeout(done, 20));
      const preview = document.createElement('canvas');
      preview.id = 'resource-states';
      preview.width = 1440;
      preview.height = 720;
      preview.style.cssText = 'position:static;width:1440px;height:720px;object-fit:contain';
      document.body.replaceChildren(preview);
      const ctx = preview.getContext('2d')!;
      ctx.fillStyle = '#677452';
      ctx.fillRect(0, 0, preview.width, preview.height);
      const nodes: ResourceNode[] = [
        ...(['tree', 'rock', 'stone', 'plant'] as const).map((kind) => ({
          id: kind,
          kind,
          x: 0,
          y: 0,
          size: 90,
        })),
        ...plantKinds.map((id, variant) => ({
          id,
          kind: 'plant' as const,
          variant,
          x: 0,
          y: 0,
          size: 90,
        })),
      ];
      return nodes.map((node, index) => {
        const live = fixture.resourceScenery(node);
        const depleted = fixture.resourceScenery(node, {
          remaining: 0,
          restoresAt: Date.now() + 60000,
        });
        const restored = fixture.resourceScenery(node);
        const states = [live, depleted];
        const matching = states.every((state) => {
          const sprite = state.sprite
            .getContext('2d')!
            .getImageData(0, 0, state.sprite.width, state.sprite.height).data;
          const mask = (state.mask as HTMLCanvasElement)
            .getContext('2d')!
            .getImageData(0, 0, state.sprite.width, state.sprite.height).data;
          return (
            sprite.some((value, i) => i % 4 === 3 && value > 128) &&
            mask.every((value, i) => i % 4 !== 3 || value === sprite[i])
          );
        });
        const shadows = states.flatMap((state, stateIndex) =>
          [false, true].map((lamp) => {
            const x = 80 + (index % 5) * 280 + (lamp ? 120 : 0);
            const y = 140 + Math.floor(index / 5) * 350 + stateIndex * 145;
            const shadow = document.createElement('canvas');
            shadow.width = shadow.height = 240;
            fixture.castShadow(
              shadow.getContext('2d')!,
              { ...state, x: 100, y: 100 },
              lamp ? { x: 40, y: 120, height: 200, radius: 250, strength: 1 } : undefined,
            );
            const pixels = shadow.getContext('2d')!.getImageData(0, 0, 240, 240).data;
            fixture.castShadow(
              ctx,
              { ...state, x, y },
              lamp ? { x: x - 60, y: y + 20, height: 200, radius: 250, strength: 1 } : undefined,
            );
            ctx.drawImage(
              state.sprite,
              x - state.width / 2,
              y - state.height,
              state.width,
              state.height,
            );
            ctx.fillStyle = '#f6ecd5';
            ctx.font = '12px sans-serif';
            ctx.fillText(
              `${stateIndex ? 'gathered' : 'live'} ${lamp ? 'lamp' : 'sun'}`,
              x - 65,
              y + 20,
            );
            if (stateIndex === 0 && !lamp) ctx.fillText(node.id, x - 65, y - 100);
            return pixels.some((value, i) => i % 4 === 3 && value > 0);
          }),
        );
        return {
          id: node.id,
          live: live.sprite.toDataURL(),
          depleted: depleted.sprite.toDataURL(),
          matching,
          shadows,
          restored: restored.sprite === live.sprite,
        };
      });
    },
    [...PLANT_KINDS],
  );
  expect(new Set(result.map((node) => node.live)).size).toBe(result.length);
  expect(new Set(result.map((node) => node.depleted)).size).toBe(result.length);
  for (const node of result) {
    expect(node.live, node.id).not.toBe(node.depleted);
    expect(node.matching, node.id).toBe(true);
    expect(node.shadows.every(Boolean), node.id).toBe(true);
    expect(node.restored, node.id).toBe(true);
  }
  await page
    .locator('#resource-states')
    .screenshot({ path: 'test-results/resource-state-shadows.png' });
});
