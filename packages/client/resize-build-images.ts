import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { Plugin, ResolvedConfig } from 'vite';
import { IMAGE_RENDER_BOUNDS } from './asset-render-sizes.ts';

// Full-color Adam7 PNGs retain alpha and progressive decoding without palette quantization.
export const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: true,
  palette: false,
  progressive: true,
} as const;

/** Resize copied public assets before the optimizer's closeBundle size comparison. */
export function resizeBuildImages(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'resize-render-images',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    writeBundle: {
      sequential: true,
      async handler() {
        for (const [name, [width, height]] of Object.entries(IMAGE_RENDER_BOUNDS)) {
          const path = resolve(config.root, config.build.outDir, 'assets', name);

          if (!existsSync(path)) {
            continue;
          }

          const original = await readFile(path);
          const image = sharp(original);
          const metadata = await image.metadata();

          if (metadata.width <= width && metadata.height <= height) {
            continue;
          }

          const output = await image
            .resize({ width, height, fit: 'inside', withoutEnlargement: true, kernel: 'nearest' })
            .png(PNG_OPTIONS)
            .toBuffer();
          await writeFile(path, output);
        }
      },
    },
  };
}
