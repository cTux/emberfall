import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import test from 'node:test';
import sharp from 'sharp';
import { build } from 'vite';
import { IMAGE_RENDER_BOUNDS } from './asset-render-sizes.ts';

for (const client of ['client']) {
  test(`${client}: Vite optimizes public and bundled PNGs without changing pixels or sources`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'emberfall-vite-images-'));
    t.after(() => {
      return rm(root, { recursive: true, force: true });
    });
    await mkdir(join(root, 'public', 'nested'), { recursive: true });
    const original = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 50, g: 90, b: 130, alpha: 0.5 },
      },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();
    const tiny = await sharp({
      create: { width: 1, height: 1, channels: 4, background: 'transparent' },
    })
      .png({ palette: true })
      .toBuffer();
    await writeFile(join(root, 'public', 'nested', 'sprite.PNG'), original);
    await writeFile(join(root, 'public', 'tiny.png'), tiny);
    await writeFile(join(root, 'public', 'credits.txt'), 'Artist attribution');
    await writeFile(join(root, 'public', 'icon.svg'), '<svg/>');
    await writeFile(join(root, 'sprite.png'), original);
    await writeFile(
      join(root, 'index.html'),
      '<img src="./sprite.png">' + '<p>Emberfall</p>'.repeat(200),
    );

    await build({
      root,
      configFile: fileURLToPath(new URL(`../${client}/vite.config.ts`, import.meta.url)),
      logLevel: 'silent',
      build: { assetsInlineLimit: 0 },
    });

    const bundled = (await readdir(join(root, 'dist', 'assets'))).find((name) => {
      return name.endsWith('.png');
    });
    assert.ok(bundled, 'fixture PNG must be emitted instead of inlined');

    for (const path of [join('nested', 'sprite.PNG'), join('assets', bundled)]) {
      const output = await readFile(join(root, 'dist', path));
      assert.ok(output.length < original.length, `${path} should shrink`);
      assert.equal(
        (await sharp(output).metadata()).isProgressive,
        true,
        `${path} should interlace`,
      );
      assert.deepEqual(
        await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      );
    }

    assert.ok((await readFile(join(root, 'dist', 'tiny.png'))).length <= tiny.length);
    assert.equal(await readFile(join(root, 'dist', 'credits.txt'), 'utf8'), 'Artist attribution');
    assert.equal(await readFile(join(root, 'dist', 'icon.svg'), 'utf8'), '<svg/>');
    assert.deepEqual(await readFile(join(root, 'public', 'nested', 'sprite.PNG')), original);
    assert.deepEqual(await readFile(join(root, 'sprite.png')), original);
    const html = await readFile(join(root, 'dist', 'index.html'));

    for (const [extension, decode] of [
      ['br', brotliDecompressSync],
      ['gz', gunzipSync],
    ] as const) {
      const compressed = await readFile(join(root, 'dist', `index.html.${extension}`));
      assert.ok(compressed.length < html.length);
      assert.deepEqual(decode(compressed), html);
      await assert.rejects(readFile(join(root, 'dist', `version.json.${extension}`)), {
        code: 'ENOENT',
      });
      await assert.rejects(readFile(join(root, 'dist', 'nested', `sprite.PNG.${extension}`)), {
        code: 'ENOENT',
      });
    }
  });
}

test('production image sizing preserves aspect, alpha, sources, and already-small artwork', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'emberfall-render-images-'));
  t.after(() => {
    return rm(root, { recursive: true, force: true });
  });
  await writeFile(join(root, 'index.html'), '<p>Image sizing fixture</p>');
  const originals = new Map<string, Buffer>();

  for (const [name, [width, height]] of Object.entries(IMAGE_RENDER_BOUNDS)) {
    const directory = join(root, 'public', 'assets', name.slice(0, name.lastIndexOf('/')));
    await mkdir(directory, { recursive: true });
    const original = await sharp({
      create: {
        width: width * 2,
        height: height * 2,
        channels: 4,
        background: { r: 50, g: 90, b: 130, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    originals.set(name, original);
    await writeFile(join(root, 'public', 'assets', name), original);
  }

  const small = await sharp({
    create: { width: 12, height: 8, channels: 4, background: 'transparent' },
  })
    .png()
    .toBuffer();
  await writeFile(join(root, 'public', 'assets', 'action-bar', 'clear.png'), small);
  originals.set('action-bar/clear.png', small);
  // Source-coordinate atlases without a declared bound must retain their exact dimensions.
  await writeFile(join(root, 'public', 'unlisted.png'), small);
  await build({
    root,
    configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
    base: '/nested-pages/',
    logLevel: 'silent',
  });

  for (const [name, original] of originals) {
    const output = await readFile(join(root, 'dist', 'assets', name));
    const before = await sharp(original).metadata();
    const after = await sharp(output).metadata();
    const [width, height] = IMAGE_RENDER_BOUNDS[name];
    assert.ok(after.width <= width && after.height <= height, `${name} fits its render bound`);
    assert.ok(
      after.width <= before.width && after.height <= before.height,
      `${name} never enlarges`,
    );
    assert.equal(after.width / after.height, before.width / before.height, `${name} keeps aspect`);
    assert.equal(after.hasAlpha, true, `${name} keeps transparency`);
    assert.deepEqual(await readFile(join(root, 'public', 'assets', name)), original);

    if (name !== 'action-bar/clear.png') {
      assert.equal(after.isProgressive, true, `${name} remains interlaced after resizing`);
      assert.ok(output.length < original.length, `${name} ships fewer bytes`);
    }
  }

  assert.deepEqual(
    await sharp(join(root, 'dist', 'assets', 'action-bar', 'clear.png'))
      .raw()
      .toBuffer(),
    await sharp(small).raw().toBuffer(),
  );
  assert.deepEqual((await sharp(join(root, 'dist', 'unlisted.png')).metadata()).width, 12);
});
