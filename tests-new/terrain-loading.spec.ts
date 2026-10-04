import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test, expect } from "@playwright/test";

test("terrain tiles are not cached from a partially loaded PNG", async ({ page }) => {
  const require = createRequire(resolve("packages/client-new/package.json"));
  const { build } = await import(pathToFileURL(require.resolve("vite")).href);
  const bundle = await build({
    configFile: false,
    root: resolve("packages/client-new"),
    logLevel: "error",
    build: {
      write: false,
      lib: {
        entry: resolve("tests-new/terrain-fixture.ts"),
        name: "TerrainFixture",
        formats: ["iife"],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === "chunk").code;
  const png = await readFile("packages/client-new/public/assets/wardrobe-style/terrain.png");
  let finishImage: (() => void) | undefined;
  const server = createServer((request, response) => {
    if (request.url === "/assets/wardrobe-style/terrain.png") {
      response.writeHead(200, { "Content-Type": "image/png", "Content-Length": png.length });
      const split = Math.floor(png.length / 2);
      response.write(png.subarray(0, split));
      finishImage = () => response.end(png.subarray(split));
    } else if (request.url === "/") {
      response.end("<html><body></body></html>");
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  try {
    const address = server.address() as { port: number };
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await page.addScriptTag({ content: code });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const fixture = (
            window as unknown as { TerrainFixture: typeof import("./terrain-fixture") }
          ).TerrainFixture;
          return fixture.terrainArt.naturalWidth;
        }),
      )
      .toBeGreaterThan(0);
    const during = await page.evaluate(() => {
      const fixture = (window as unknown as { TerrainFixture: typeof import("./terrain-fixture") })
        .TerrainFixture;
      fixture.terrainTile(0);
      fixture.terrainTile(1, 64);
      fixture.terrainTile(2);
      return fixture.terrainArt.complete;
    });
    expect(during).toBe(false);
    finishImage!();
    const alphas = await page.evaluate(async () => {
      const fixture = (window as unknown as { TerrainFixture: typeof import("./terrain-fixture") })
        .TerrainFixture;
      await fixture.terrainArt.decode();
      return [fixture.terrainTile(0), fixture.terrainTile(1, 64), fixture.terrainTile(2)].map(
        (tile) => {
          const pixels = tile.getContext("2d")!.getImageData(0, 0, tile.width, tile.height).data;
          let opaque = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++;
          return opaque / (tile.width * tile.height);
        },
      );
    });
    expect(alphas).toEqual([1, 1, 1]);
  } finally {
    finishImage?.();
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
