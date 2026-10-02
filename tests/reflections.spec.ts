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
  expect(result.alpha).toBeCloseTo(0.8);
  expect(result.transform).toEqual([2, 3]);
  expect(result.composite).toBe("source-over");
});
