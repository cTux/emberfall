import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

test("blue portal ripples animate, stay inside the oval, and render without bloom", async ({
  page,
}) => {
  const source = readFileSync("packages/client/src/forest.ts", "utf8");
  const renderer = stripTypeScriptTypes(
    source.slice(source.indexOf("export function drawPortal"), source.indexOf("const fogTexture")),
  ).replace("export function", "function");
  await page.setContent('<canvas width="360" height="180"></canvas>');
  await page.addScriptTag({ content: `function drawNameBadge() {}\n${renderer}` });
  const frames = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    const draw = Reflect.get(window, "drawPortal");
    const interiors: number[][] = [];
    for (const [x, time, bloom] of [
      [60, 0, false],
      [180, 1600, false],
      [300, 1600, true],
    ] as const) {
      draw(ctx, x, 120, time, Boolean(bloom), "", false);
      interiors.push(Array.from(ctx.getImageData(x - 15, 65, 30, 40).data));
    }
    return {
      interiors,
      outside: Array.from(ctx.getImageData(37, 53, 1, 1).data),
      restored: ctx.globalAlpha === 1 && ctx.shadowBlur === 0 && ctx.getTransform().isIdentity,
    };
  });
  expect(frames.interiors[0]).not.toEqual(frames.interiors[1]);
  for (const pixels of frames.interiors) {
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i + 2]).toBeGreaterThan(pixels[i]);
      expect(pixels[i + 3]).toBe(255);
    }
  }
  expect(frames.outside).toEqual([0, 0, 0, 0]);
  expect(frames.restored).toBe(true);
  await page.locator("canvas").screenshot({ path: "test-results/blue-portal-phases.png" });
});
