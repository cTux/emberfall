import { PixiContext } from '../packages/client/src/rendering/pixi-context';

import { drawClassProjectiles, drawLootAndBlood } from '../packages/client/src/combat-effects';
import { pickupArt, effectsArt, artImages } from '../packages/client/src/art';
import { LOOT_ITEM_IDS, Rarity } from '../packages/core/src/index';
import type { SceneState } from '../packages/common/src/index';

export async function compareLoot(pixi: PixiContext, gpu: HTMLCanvasElement) {
  while (
    [pickupArt, effectsArt].some((image) => !image.complete || image.dataset.artReady !== 'true')
  )
    await new Promise((resolve) => setTimeout(resolve, 20));
  const projectilePixels: number[] = [];
  for (const fallback of [false, true]) {
    pixi.begin();
    pixi.fillStyle = '#17251d';
    pixi.fillRect(0, 0, 256, 256);
    if (fallback) for (const image of [pickupArt, effectsArt]) image.dataset.artReady = 'false';
    for (const [row, kind] of (['arrow', 'fireball', 'roots'] as const).entries()) {
      for (let frame = 0; frame < (kind === 'arrow' ? 4 : 3); frame++) {
        const x = 32 + frame * 64,
          y = 40 + row * 80;
        drawClassProjectiles(
          pixi as unknown as CanvasRenderingContext2D,
          {
            playerShots: [{ kind, x, y, angle: (frame * Math.PI) / 3 }],
            explosions: [],
          } as unknown as SceneState,
          frame * 100,
          (x, y) => ({ x, y }),
        );
      }
    }
    pixi.present();
    const preview = document.createElement('canvas');
    preview.width = preview.height = 256;
    preview.style.width = '512px';
    preview.style.imageRendering = 'pixelated';
    const c = preview.getContext('2d')!;
    c.drawImage(gpu, 0, 0);
    document.body.append(preview);
    for (const [row, kind] of (['arrow', 'fireball', 'roots'] as const).entries())
      for (let frame = 0; frame < (kind === 'arrow' ? 4 : 3); frame++) {
        const pixels = c.getImageData(frame * 64, row * 80 + 8, 64, 64).data;
        let green = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (
            pixels[i] >= 175 &&
            pixels[i + 1] >= 245 &&
            pixels[i + 2] >= 155 &&
            pixels[i + 2] <= 185
          )
            green++;
        projectilePixels.push(green);
      }
    if (fallback) for (const image of [pickupArt, effectsArt]) image.dataset.artReady = 'true';
  }
  const drops = [...LOOT_ITEM_IDS, 'health-potion'].map((itemId, id) => ({
    id,
    itemId,
    kind: 'item' as const,
    x: 32 + (id % 4) * 64,
    y: 40 + Math.floor(id / 4) * 64,
    at: 1000,
  }));
  const drawDrops = () => {
    pixi.begin();
    drawLootAndBlood(
      pixi as unknown as CanvasRenderingContext2D,
      { drops, damage: [] } as unknown as SceneState,
      1000,
      (x, y) => ({ x, y }),
      { x: 0, y: 0, width: 256, height: 256 },
    );
    pixi.present();
  };
  drawDrops();
  while (artImages.some((image) => !image.complete || image.dataset.artReady !== 'true'))
    await new Promise((resolve) => setTimeout(resolve, 20));
  drawDrops();
  const lootPreview = document.createElement('canvas');
  lootPreview.width = lootPreview.height = 256;
  lootPreview.style.width = '512px';
  lootPreview.style.imageRendering = 'pixelated';
  const lootContext = lootPreview.getContext('2d')!;
  lootContext.drawImage(gpu, 0, 0);
  document.body.append(lootPreview);
  const lootPixels = drops.map(({ itemId, x, y }) => {
    const pixels = lootContext.getImageData(x - 12, y - 18, 24, 30).data;
    let colored = 0,
      purple = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 128) colored++;
      if (pixels[i] === 195 && pixels[i + 1] === 166 && pixels[i + 2] === 232) purple++;
    }
    const red = (dx: number, dy: number) => lootContext.getImageData(x + dx, y + dy, 1, 1).data[0];
    return {
      itemId,
      colored,
      purple,
      beam: red(0, -18),
      above: red(0, -23),
      beside: red(5, -18),
    };
  });
  pixi.begin();
  const rarities = Object.values(Rarity);
  drawLootAndBlood(
    pixi as unknown as CanvasRenderingContext2D,
    {
      drops: rarities.map((rarity, id) => ({
        id,
        itemId: 'warrior-sword',
        rarity,
        kind: 'item',
        x: 24 + id * 48,
        y: 60,
        at: 1000,
      })),
      damage: [],
    } as unknown as SceneState,
    1000,
    (x, y) => ({ x, y }),
    { x: 0, y: 0, width: 256, height: 256 },
  );
  pixi.present();
  lootContext.clearRect(0, 0, 256, 256);
  lootContext.drawImage(gpu, 0, 0);
  const rarityPixels = rarities.map((rarity, index) => ({
    rarity,
    color: [...lootContext.getImageData(24 + index * 48, 43, 1, 1).data],
  }));
  return { projectilePixels, lootPixels, rarityPixels };
}
