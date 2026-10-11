import { test, expect } from "./fixtures";
import { writeFile } from "node:fs/promises";

test("animated asset gallery loads transparent frames and changes action and facing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/wardrobe-style/") && !response.ok())
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/?art-gallery");
  const canvas = page.getByLabel("Animated asset gallery");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth === 96),
        ),
    )
    .toBe(true);
  await page.getByLabel("Animation", { exact: true }).selectOption("idle");
  await expect(canvas).toHaveAttribute("data-frame", "0");
  const ambient = await canvas.evaluate(async (element: HTMLCanvasElement) => {
    const ctx = element.getContext("2d")!;
    const portalBefore = ctx.getImageData(430, 600, 176, 176).data;
    const smokeBefore = ctx.getImageData(10, 800, 396, 48).data;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const portalAfter = ctx.getImageData(430, 600, 176, 176).data;
    const smokeAfter = ctx.getImageData(10, 800, 396, 48).data;
    let interiorChanges = 0,
      stoneChanges = 0;
    for (let y = 0; y < 176; y++)
      for (let x = 0; x < 176; x++) {
        const index = (y * 176 + x) * 4;
        const changed = [0, 1, 2].some((c) => portalBefore[index + c] !== portalAfter[index + c]);
        if (!changed) continue;
        const radius = ((x - 88) / (176 * 0.22)) ** 2 + ((y - 176 * 0.58) / (176 * 0.3)) ** 2;
        if (radius < 0.9) interiorChanges++;
        else if (radius > 1.1) stoneChanges++;
      }
    return {
      interiorChanges,
      stoneChanges,
      smokeChanged: smokeBefore.some((v, i) => v !== smokeAfter[i]),
    };
  });
  expect(ambient.stoneChanges).toBe(0);
  expect(ambient.interiorChanges).toBeGreaterThan(100);
  expect(ambient.smokeChanged).toBe(true);
  const galleryPng = await canvas.evaluate(
    (element: HTMLCanvasElement) => element.toDataURL().split(",")[1],
  );
  await writeFile("test-results/wardrobe-gallery-canvas.png", Buffer.from(galleryPng, "base64"));
  await page.screenshot({ path: "test-results/wardrobe-art-gallery.png", fullPage: true });
  const down = await canvas.screenshot();
  await page.getByLabel("Direction", { exact: true }).selectOption("1");
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(down)).toBe(false);
  await page.getByLabel("Animation", { exact: true }).selectOption("walk");
  await expect(canvas).toHaveAttribute("data-frame", /[1-4]/);
  const before = await canvas.getAttribute("data-frame");
  await expect.poll(() => canvas.getAttribute("data-frame")).not.toBe(before);
  await page.getByLabel("Direction", { exact: true }).selectOption("0");
  await expect(canvas).toHaveAttribute("data-frame", "1");
  await page.screenshot({ path: "test-results/wardrobe-art-walk.png", fullPage: true });
  await page.getByLabel("Direction", { exact: true }).selectOption("3");
  await page.getByLabel("Animation", { exact: true }).selectOption("attack");
  await expect(canvas).toHaveAttribute("data-frame", "6");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  for (const direction of ["0", "1", "2", "3"]) {
    await page.getByLabel("Direction", { exact: true }).selectOption(direction);
    await page.waitForTimeout(50);
    const png = await canvas.evaluate(
      (element: HTMLCanvasElement) => element.toDataURL().split(",")[1],
    );
    await writeFile(`test-results/wardrobe-attack-${direction}.png`, Buffer.from(png, "base64"));
  }
  await page.screenshot({ path: "test-results/wardrobe-art-attacks.png", fullPage: true });
  await page.getByLabel("Animation", { exact: true }).selectOption("fallen");
  await expect(canvas).toHaveAttribute("data-frame", "7");
  await page.screenshot({ path: "test-results/wardrobe-art-fallen.png", fullPage: true });
  expect(errors).toEqual([]);
});
