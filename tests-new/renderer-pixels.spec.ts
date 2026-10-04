import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test, expect } from "./fixtures";

test("Pixi preserves transparent vignette centers and SVG debuff pixels", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "warning" && /blend|texture/i.test(message.text()))
      errors.push(message.text());
  });
  const require = createRequire(resolve("packages/client-new/package.json"));
  const { build } = await import(pathToFileURL(require.resolve("vite")).href);
  const bundle = await build({
    configFile: false,
    define: { "process.env.NODE_ENV": '"production"' },
    root: resolve("packages/client-new"),
    logLevel: "error",
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve("tests-new/renderer-fixture.ts"),
        name: "RendererFixture",
        formats: ["iife"],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === "chunk").code;
  await page.route("**/renderer-test", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body></body></html>" }),
  );
  await page.goto("/renderer-test");
  await page.addScriptTag({ content: code });
  const { results, icons, lights, edges } = await page.evaluate(async () => {
    const fixture = (window as unknown as { RendererFixture: typeof import("./renderer-fixture") })
      .RendererFixture;
    return fixture.compare();
  });
  await page.screenshot({ path: "test-results/new-renderer-pixels.png" });
  expect(errors).toEqual([]);
  expect(lights.reused).toBe(lights.first);
  expect(lights.translated).toBe(lights.first);
  expect(lights.moved).toBeGreaterThan(lights.first);
  expect(lights.toggled).toBeGreaterThan(lights.moved);
  expect(edges.filter((count) => count > 0)).toHaveLength(1);
  for (const [kind, count] of Object.entries(icons))
    expect(count, `${kind} colored glyph`).toBeGreaterThan(2);
  for (const [name, { actual, expected }] of Object.entries(results)) {
    for (let channel = 0; channel < 4; channel++) {
      expect
        .soft(Math.abs(actual[channel] - expected[channel]), `${name}: ${actual} vs ${expected}`)
        .toBeLessThanOrEqual(3);
    }
  }
});
