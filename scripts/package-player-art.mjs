import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { isolatePlayerFrames } from './art/isolate-player-frames.mjs';
import { packPlayerFrames } from './art/pack-player-frames.mjs';
import { matchPlayerPalette } from './art/match-player-palette.mjs';

// Art and handedness are authored in the sources; packaging locks walk colors
// to the standing pose so separately generated sheets cannot change materials.
const root = 'packages/client/public/assets/wardrobe-style';
const classes = {
  warrior: { rows: 9, extraRows: 3, approved: [2, 3] },
  ranger: { rows: 10, extraRows: 0, approved: [0] },
  mage: { rows: 10, extraRows: 1, approved: [] },
  druid: { rows: 10, extraRows: 10, approved: [] },
};
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [name, config] of Object.entries(classes)) {
    const source = await readFile(`${root}/${name}-complete.png`);
    const stride = await readFile(`${root}/${name}-stride.png`);
    const repair = await readFile(`${root}/${name}-stride-revised.png`);
    const extra = config.extraRows ? await readFile(`${root}/${name}-extra.png`) : null;
    const isolated = await page.evaluateHandle(isolatePlayerFrames, {
      source: source.toString('base64'),
      name,
      extra: extra?.toString('base64'),
      stride: stride.toString('base64'),
      repair: repair.toString('base64'),
      config,
    });
    let frames;
    try {
      frames = await page.evaluateHandle(packPlayerFrames, { isolated, name, config });
      const packed = await page.evaluate(matchPlayerPalette, frames);
      await writeFile(`${root}/${name}-atlas.png`, Buffer.from(packed.png, 'base64'));
      await writeFile(
        `${root}/${name}-atlas.json`,
        JSON.stringify(
          {
            scale: packed.scale,
            frames: packed.frames,
            strideScale: packed.strideScale,
            repairScale: packed.repairScale,
            strides: packed.strides,
          },
          null,
          2,
        ) + '\n',
      );
      console.log(`${name}: ${packed.frames.length} isolated frames, scale ${packed.scale}`);
    } finally {
      await frames?.dispose();
      await isolated.dispose();
    }
  }
} finally {
  await browser.close();
}
