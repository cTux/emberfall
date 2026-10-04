import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { optimizeImages } from "./optimize-images.ts";

test("compresses nested PNGs while preserving pixels, metadata and other files", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-images-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "assets"));
  const path = join(directory, "assets", "sprite.PNG");
  const original = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 50, g: 90, b: 130, alpha: 0.5 },
    },
  })
    .withIccProfile("srgb")
    .png({ compressionLevel: 0 })
    .toBuffer();
  await writeFile(path, original);
  await writeFile(join(directory, "credits.txt"), "Artist attribution");
  await writeFile(join(directory, "icon.svg"), "<svg/>");

  const result = await optimizeImages(directory);
  const output = await readFile(path);
  assert.equal(result.scanned, 1);
  assert.equal(result.optimized, 1);
  assert.ok(output.length < original.length);
  assert.deepEqual(
    await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  );
  assert.deepEqual((await sharp(output).metadata()).icc, (await sharp(original).metadata()).icc);
  assert.equal(await readFile(join(directory, "credits.txt"), "utf8"), "Artist attribution");
  assert.equal(await readFile(join(directory, "icon.svg"), "utf8"), "<svg/>");
  // Already optimized files must never grow or be needlessly rewritten.
  assert.equal((await optimizeImages(directory)).optimized, 0);
  assert.deepEqual(await readFile(path), output);
});

test("never increases the size of a palette PNG", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-images-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const original = await sharp({
    create: { width: 1, height: 1, channels: 4, background: "transparent" },
  })
    .png({ palette: true })
    .toBuffer();
  const path = join(directory, "tiny.png");
  await writeFile(path, original);
  await optimizeImages(directory);
  assert.ok((await readFile(path)).length <= original.length);
});

test("preserves a 16-bit PNG byte for byte", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-images-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const original = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "red" },
  })
    .toColourspace("rgb16")
    .png()
    .toBuffer();
  assert.equal((await sharp(original).metadata()).depth, "ushort");
  const path = join(directory, "high-depth.png");
  await writeFile(path, original);
  assert.equal((await optimizeImages(directory)).optimized, 0);
  assert.deepEqual(await readFile(path), original);
});

test("fails on a missing output directory or invalid PNG", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-images-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(optimizeImages(join(directory, "missing")), { code: "ENOENT" });
  await writeFile(join(directory, "broken.png"), "broken");
  await assert.rejects(optimizeImages(directory));
  assert.equal(await readFile(join(directory, "broken.png"), "utf8"), "broken");
});
