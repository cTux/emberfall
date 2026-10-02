import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { GRAPHICS_PRESETS } from "../packages/client/src/graphics";

const source = readFileSync("packages/client/src/forest.ts", "utf8");
const renderer = stripTypeScriptTypes(
  source.slice(source.indexOf("const portalSilhouette"), source.indexOf("const fogTexture")),
).replace("export function", "function");
const lighting = stripTypeScriptTypes(
  readFileSync("packages/client/src/lighting.ts", "utf8"),
).replaceAll("export ", "");

test("blue portal ripples animate, stay inside the oval, and render without bloom", async ({
  page,
}) => {
  await page.setContent('<canvas width="360" height="180"></canvas>');
  await page.addScriptTag({ content: `function drawNameBadge() {}\n${lighting}\n${renderer}` });
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
      draw(ctx, x, 120, time, Boolean(bloom), "", false, false);
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

test("portal shadows follow Low, Balanced and High presets and the shadow toggle", async ({
  page,
}) => {
  await page.setContent('<canvas width="480" height="200"></canvas>');
  await page.addScriptTag({ content: `function drawNameBadge() {}\n${lighting}\n${renderer}` });
  const samples = await page.evaluate((presets) => {
    const canvas = document.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    const draw = Reflect.get(window, "drawPortal");
    const samples = Object.values(presets).map((quality, i) => {
      const x = 70 + i * 160;
      draw(ctx, x, 100, 1600, quality.bloom, "", false, quality.shadows);
      const shadow = Array.from(ctx.getImageData(x + 30, 138, 1, 1).data);
      const contact = Array.from(ctx.getImageData(x - 28, 101, 1, 1).data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, x, 100, 1600, quality.bloom, "", false, false);
      const disabled = Array.from(ctx.getImageData(x + 30, 138, 1, 1).data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return {
        shadow,
        contact,
        disabled,
        restored: ctx.globalAlpha === 1 && ctx.getTransform().isIdentity,
      };
    });
    Object.values(presets).forEach((quality, i) =>
      draw(ctx, 70 + i * 160, 100, 1600, quality.bloom, "", false, quality.shadows),
    );
    return samples;
  }, GRAPHICS_PRESETS);
  expect(samples[0].shadow).toEqual([0, 0, 0, 0]);
  expect(samples[0].contact[3]).toBe(255);
  for (const sample of samples.slice(1)) {
    expect(sample.shadow[3]).toBeGreaterThan(sample.disabled[3] + 50);
    expect(sample.contact[3]).toBeLessThan(255);
  }
  expect(samples.every((sample) => sample.restored)).toBe(true);
  await page.locator("canvas").screenshot({ path: "test-results/portal-quality-shadows.png" });
});
