import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export const require = createRequire(resolve('packages/client/package.json'));

export const sharp =
  require('sharp') as typeof import('../packages/client/node_modules/sharp/lib/index.js');

import type { Page, Locator } from '@playwright/test';

export function outlineProbes(page: Page, canvas: Locator, graphicsPreset: string) {
  const yellowPixels = async (name: string) => {
    const image = await canvas.screenshot({
      path: `test-results/${graphicsPreset}-${name}.png`,
    });
    const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
    let count = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] > 220 && data[i + 1] > 180 && data[i + 2] < 45) {
        count++;
      }
    }

    return count;
  };

  const greenPixels = async (name: string) => {
    const image = await canvas.screenshot({
      path: `test-results/${graphicsPreset}-${name}.png`,
    });
    const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
    let count = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 1] > 70 && data[i] < data[i + 1] * 0.18 && data[i + 2] < data[i + 1] * 0.18) {
        count++;
      }
    }

    return count;
  };

  const altDefaultsPrevented = async (code: string, type: 'keydown' | 'keyup') => {
    return page.evaluate(
      ({ code, type }) => {
        return !window.dispatchEvent(
          new KeyboardEvent(type, {
            key: 'Alt',
            code,
            bubbles: true,
            cancelable: true,
          }),
        );
      },
      { code, type },
    );
  };

  return { yellowPixels, greenPixels, altDefaultsPrevented };
}
