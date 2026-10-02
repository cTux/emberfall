import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync("packages/client/src/village.ts", "utf8");
const renderer = stripTypeScriptTypes(
  source.slice(
    source.indexOf("export function drawTorchFire"),
    source.indexOf("/** Light contribution"),
  ),
).replace("export function", "function");

test("tall lamps animate their original fire and honor ember and bloom settings", async ({
  page,
}) => {
  await page.goto("/");
  await page.setContent('<canvas width="320" height="240"></canvas>');
  await page.addScriptTag({ content: renderer });
  const result = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/assets/lanterns/lantern-animation.png";
    await image.decode();
    const ctx = document.querySelector("canvas")!.getContext("2d")!;
    const draw = Reflect.get(window, "drawTorchFire");
    const cells: number[][] = [];
    const embers: { color: string; glow: number; alpha: number; y: number }[] = [];
    const drawImage = ctx.drawImage.bind(ctx);
    ctx.drawImage = (...args: unknown[]) => {
      cells.push([Number(args[1]), Number(args[2])]);
      Reflect.apply(drawImage, ctx, args);
    };
    const fillRect = ctx.fillRect.bind(ctx);
    ctx.fillRect = (x, y, w, h) => {
      embers.push({
        color: ctx.fillStyle as string,
        glow: ctx.shadowBlur,
        alpha: ctx.globalAlpha,
        y,
      });
      fillRect(x, y, w, h);
    };
    ctx.globalAlpha = 0.2;
    for (let frame = 0; frame < 38; frame++) draw(ctx, image, 0, 0, frame * 80, false, false);
    const withoutParticles = embers.length;
    draw(ctx, image, 0, 60, 800, true, false);
    const withoutBloom = embers.splice(0);
    draw(ctx, image, 0, 60, 800, true, true);
    const withBloom = embers.splice(0);
    const restored =
      ctx.globalAlpha === 0.2 && ctx.shadowBlur === 0 && ctx.getTransform().isIdentity;
    ctx.clearRect(0, 0, 320, 240);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#25392f";
    ctx.fillRect(0, 0, 320, 240);
    ctx.imageSmoothingEnabled = false;
    ctx.scale(3, 3);
    const post = new Image();
    post.src = "/assets/lanterns/lamp-post.png";
    await post.decode();
    ctx.drawImage(post, 48.25, 25, 7.5, 45);
    draw(ctx, image, 52, 70, 800, true, true);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      cells,
      withoutParticles,
      withoutBloom,
      withBloom,
      restored,
    };
  });
  expect([result.width, result.height]).toEqual([168, 204]);
  expect(new Set(result.cells.slice(0, 38).map(String)).size).toBe(38);
  expect(result.cells[37]).toEqual([48, 170]);
  expect(result.withoutParticles).toBe(0);
  expect(result.withoutBloom).toHaveLength(12);
  expect(new Set(result.withoutBloom.map((ember) => ember.color))).toEqual(
    new Set(["#ffe6a3", "#ffac42", "#f45b28"]),
  );
  expect(result.withoutBloom.every((ember) => ember.glow === 0 && ember.alpha <= 0.16)).toBe(true);
  expect(result.restored).toBe(true);
  expect(result.withBloom.every((ember) => ember.glow === 6)).toBe(true);
  await page.locator("canvas").screenshot({ path: "test-results/torch-fire.png" });
});
