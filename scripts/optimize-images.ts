import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

/** Recompress built PNGs without changing asset URLs or source artwork. */
export async function optimizeImages(directory: string) {
  const totals = { scanned: 0, optimized: 0, before: 0, after: 0 };
  async function visit(folder: string) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
        const original = await readFile(path);
        const metadata = await sharp(original).metadata();
        totals.scanned++;
        totals.before += original.length;
        let output = original;
        // Do not flatten animation or reduce higher bit depths.
        if ((metadata.pages ?? 1) === 1 && metadata.depth === "uchar") {
          const compressed = await sharp(original)
            .keepMetadata()
            .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
            .toBuffer();
          if (compressed.length < original.length) {
            output = compressed;
            await writeFile(path, output);
            totals.optimized++;
          }
        }
        totals.after += output.length;
      }
    }
  }
  await visit(directory);
  return totals;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: node scripts/optimize-images.ts <build-directory>");
  const result = await optimizeImages(directory);
  console.log(
    `PNG optimization: ${result.optimized}/${result.scanned} files smaller; ` +
      `${result.before} -> ${result.after} bytes (${result.before - result.after} bytes saved)`,
  );
}
