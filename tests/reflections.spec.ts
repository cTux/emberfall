import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

test("forest preview reflections toggle immediately", async ({ page }) => {
  await page.addInitScript(() => {
    const reflections = new WeakSet<HTMLCanvasElement>();
    const proto = CanvasRenderingContext2D.prototype;
    proto.fillRect = new Proxy(proto.fillRect, {
      apply(target, ctx: CanvasRenderingContext2D, args) {
        if (ctx.globalCompositeOperation === "destination-in") reflections.add(ctx.canvas);
        return Reflect.apply(target, ctx, args);
      },
    });
    proto.drawImage = new Proxy(proto.drawImage, {
      apply(target, ctx: CanvasRenderingContext2D, args) {
        if (
          args[0] instanceof HTMLCanvasElement &&
          reflections.has(args[0]) &&
          ctx.canvas.hasAttribute("aria-label")
        )
          document.body.dataset.reflections = "yes";
        return Reflect.apply(target, ctx, args);
      },
    });
  });
  await page.goto("/");
  await expect(page.getByLabel("Forest preview")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-reflections", "yes");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await page.getByLabel("Reflections (2D)", { exact: true }).uncheck();
  await page.waitForTimeout(100);
  await page.evaluate(() => delete document.body.dataset.reflections);
  await page.waitForTimeout(150);
  expect(await page.locator("body").getAttribute("data-reflections")).toBeNull();
  await page.getByLabel("Reflections (2D)", { exact: true }).check();
  await expect(page.locator("body")).toHaveAttribute("data-reflections", "yes");
  await page.getByRole("button", { name: "Close Settings" }).click();
  await page.screenshot({ path: "test-results/reflections-preview.png" });
  await page.getByRole("button", { name: /New Permanent World/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.evaluate(() => delete document.body.dataset.reflections);
  await expect(page.locator("body")).toHaveAttribute("data-reflections", "yes");
  await page.screenshot({ path: "test-results/reflections-village.png" });
});

test("irregular puddles contain every reflected pixel and replacing water clears the old mask", async ({
  page,
}) => {
  await page.goto("/");
  await page.setContent('<canvas width="240" height="160"></canvas>');
  await page.addScriptTag({
    content: stripTypeScriptTypes(
      readFileSync("packages/client/src/reflections.ts", "utf8"),
    ).replaceAll("export ", ""),
  });
  const result = await page.evaluate(() => {
    const ctx = document.querySelector("canvas")!.getContext("2d")!;
    const path = Reflect.get(window, "puddlePath")([[100, 75, 65, 26]]);
    Reflect.get(window, "drawPuddles")(ctx, path);
    ctx.clearRect(0, 0, 240, 160);
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 1;
    sprite.getContext("2d")!.fillRect(0, 0, 1, 1);
    Reflect.get(window, "drawReflection")(ctx, sprite, 120, 0, 240, 360);
    const pixels = ctx.getImageData(0, 0, 240, 160).data;
    let inside = 0,
      outside = 0;
    for (let y = 0; y < 160; y++)
      for (let x = 0; x < 240; x++) {
        if (!pixels[(y * 240 + x) * 4 + 3]) continue;
        if (ctx.isPointInPath(path, x + 0.5, y + 0.5)) inside++;
        else if (
          ![
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ].some(([dx, dy]) => ctx.isPointInPath(path, x + 0.5 + dx, y + 0.5 + dy))
        )
          outside++;
      }
    Reflect.get(window, "drawPuddles")(ctx, new Path2D());
    ctx.clearRect(0, 0, 240, 160);
    Reflect.get(window, "drawReflection")(ctx, sprite, 120, 0, 240, 360);
    return { inside, outside, replaced: ctx.getImageData(100, 75, 1, 1).data[3] };
  });
  expect(result.inside).toBeGreaterThan(1000);
  expect(result.outside).toBe(0);
  expect(result.replaced).toBe(0);
});

test("sprite reflections mirror the selected frame, fade, flip, and preserve drawing state", async ({
  page,
}) => {
  await page.goto("/");
  await page.setContent('<canvas width="80" height="80"></canvas>');
  await page.addScriptTag({
    content: stripTypeScriptTypes(
      readFileSync("packages/client/src/reflections.ts", "utf8"),
    ).replaceAll("export ", ""),
  });
  const result = await page.evaluate(() => {
    const sprite = document.createElement("canvas");
    sprite.width = 40;
    sprite.height = 40;
    const source = sprite.getContext("2d")!;
    source.fillStyle = "red";
    source.fillRect(20, 0, 20, 20);
    source.fillStyle = "blue";
    source.fillRect(20, 20, 10, 20);
    source.fillStyle = "lime";
    source.fillRect(30, 20, 10, 20);
    const ctx = document.querySelector("canvas")!.getContext("2d")!;
    const water = new Path2D();
    water.rect(15, 20, 10, 18);
    water.rect(45, 20, 10, 18);
    Reflect.get(window, "drawReflection")(ctx, sprite, 25, 20, 20, 40, [20, 0, 20, 40]);
    const dry = ctx.getImageData(20, 21, 1, 1).data[3];
    Reflect.get(window, "drawPuddles")(ctx, water);
    ctx.clearRect(0, 0, 80, 80);
    ctx.translate(2, 3);
    ctx.globalAlpha = 0.8;
    Reflect.get(window, "drawReflection")(ctx, sprite, 25, 20, 20, 40, [20, 0, 20, 40]);
    const pixel = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    const normal = pixel(20, 24);
    const faded = pixel(20, 38);
    Reflect.get(window, "drawReflection")(ctx, sprite, 55, 20, 20, 40, [20, 0, 20, 40], true);
    return {
      normal,
      faded,
      flipped: pixel(50, 24),
      outside: pixel(10, 24),
      dry,
      clipped: pixel(30, 24),
      alpha: ctx.globalAlpha,
      transform: [ctx.getTransform().e, ctx.getTransform().f],
      composite: ctx.globalCompositeOperation,
    };
  });
  expect(result.normal[2]).toBeGreaterThan(240);
  expect(result.flipped[1]).toBeGreaterThan(240);
  expect(result.faded[0]).toBeGreaterThan(240);
  expect(result.normal[3]).toBeGreaterThan(result.faded[3]);
  expect(result.outside[3]).toBe(0);
  expect(result.dry).toBe(0);
  expect(result.clipped[3]).toBe(0);
  expect(result.alpha).toBeCloseTo(0.8);
  expect(result.transform).toEqual([2, 3]);
  expect(result.composite).toBe("source-over");
});
