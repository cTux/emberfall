import { test, expect } from "./fixtures";
import { writeFile } from "node:fs/promises";

test("all player poses have safe gutters, six distinct gaits and stable standing colors", async ({
  page,
}) => {
  await page.goto("/?art-gallery");
  await expect(page.getByLabel("Animated asset gallery")).toHaveAttribute("data-ready", "true");
  const result = await page.evaluate(async () => {
    const names = ["warrior", "ranger", "mage", "druid"];
    const images = await Promise.all(
      names.map(async (name) => {
        const image = new Image();
        image.src = `/assets/wardrobe-style/${name}-atlas.png`;
        await image.decode();
        return image;
      }),
    );
    const failures: string[] = [];
    const tile = document.createElement("canvas");
    tile.width = tile.height = 64;
    const ctx = tile.getContext("2d", { willReadFrequently: true })!;
    const walks = [1, 2, 3, 4, 8, 9];
    images.forEach((image, i) => {
      if (image.width !== 256 || image.height !== 640) failures.push(`${names[i]} size`);
      for (let col = 0; col < 4; col++) {
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(image, col * 64, 0, 64, 64, 0, 0, 64, 64);
        const idle = ctx.getImageData(0, 0, 64, 64).data;
        const palette: number[][] = [];
        const idleTone = [0, 0, 0];
        let idleCount = 0;
        for (let i = 0; i < idle.length; i += 4)
          if (idle[i + 3] >= 128) {
            palette.push([idle[i], idle[i + 1], idle[i + 2]]);
            if (idle[i + 3] >= 200) {
              idleCount++;
              idleTone.forEach((_, channel) => (idleTone[channel] += idle[i + channel]));
            }
          }
        const walkTone = [0, 0, 0];
        let walkCount = 0;
        const checked = new Set<string>();
        const distinct = new Set<string>();
        const feet = new Set<string>();
        const contacts: number[] = [];
        for (let row = 0; row < 10; row++) {
          ctx.clearRect(0, 0, 64, 64);
          ctx.drawImage(image, col * 64, row * 64, 64, 64, 0, 0, 64, 64);
          const pixels = ctx.getImageData(0, 0, 64, 64).data;
          let count = 0;
          for (let y = 0; y < 64; y++)
            for (let x = 0; x < 64; x++) {
              if (pixels[(y * 64 + x) * 4 + 3] === 0) continue;
              count++;
              if (x < 2 || x >= 62 || y < 2 || y >= 62)
                failures.push(`${names[i]} ${col},${row} border`);
            }
          if (count < 100) failures.push(`${names[i]} ${col},${row} empty`);
          if (walks.includes(row)) {
            for (let p = 0; p < pixels.length; p += 4) {
              if (pixels[p + 3] < 200) continue;
              const rgb = [pixels[p], pixels[p + 1], pixels[p + 2]];
              walkCount++;
              walkTone.forEach((_, channel) => (walkTone[channel] += rgb[channel]));
              const key = rgb.join(",");
              if (checked.has(key)) continue;
              checked.add(key);
              // Allow canvas alpha round-trip rounding, but reject a new tone
              // introduced by a separately generated animation sheet.
              if (
                !palette.some((color) =>
                  color.every((value, channel) => Math.abs(value - rgb[channel]) <= 3),
                )
              )
                failures.push(`${names[i]} ${col},${row} changes standing palette: ${key}`);
            }
            distinct.add(tile.toDataURL());
            // Alpha only: recoloring robes or animating a weapon must not hide
            // a frozen lower-leg silhouette. Inspect the bottom eight pixels.
            const silhouette: number[] = [];
            for (let y = 53; y < 61; y++)
              for (let x = 16; x < 48; x++)
                silhouette.push(pixels[(y * 64 + x) * 4 + 3] > 128 ? 1 : 0);
            feet.add(silhouette.join(""));
            let contactX = 0,
              contactPixels = 0;
            for (let y = 58; y < 61; y++)
              for (let x = 16; x < 48; x++)
                if (pixels[(y * 64 + x) * 4 + 3] > 128) {
                  contactX += x;
                  contactPixels++;
                }
            if (contactPixels) contacts.push(contactX / contactPixels);
          }
        }
        // A sheet can use the right colors yet look brighter by overusing its
        // highlights. Compare the whole six-phase cycle to standing at rest.
        if (
          idleTone.some(
            (sum, channel) => Math.abs(sum / idleCount - walkTone[channel] / walkCount) > 5,
          )
        )
          failures.push(`${names[i]} ${col} changes overall standing tone`);
        if (distinct.size !== 6) failures.push(`${names[i]} ${col} repeated gait`);
        if (feet.size < 4) failures.push(`${names[i]} ${col} passive feet`);
        // Front/back must transfer ground contact between two foot tracks,
        // not simply pump a single centered boot vertically.
        if (col < 2 && Math.max(...contacts) - Math.min(...contacts) < 3)
          failures.push(`${names[i]} ${col} does not alternate foot contact`);
        if (col >= 2) {
          const silhouettes = [...feet];
          const spans = silhouettes.map((silhouette) => {
            const occupied = [...silhouette].flatMap((pixel, index) =>
              pixel === "1" ? [index % 32] : [],
            );
            return occupied.length ? Math.max(...occupied) - Math.min(...occupied) : 0;
          });
          if (Math.max(...spans) - Math.min(...spans) < 4)
            failures.push(`${names[i]} ${col} lacks a narrow passing pose`);
          const changed = Math.max(
            ...silhouettes.flatMap((a) =>
              silhouettes.map((b) =>
                [...a].reduce((count, pixel, index) => count + Number(pixel !== b[index]), 0),
              ),
            ),
          );
          // A side-on step must change at least one fifth of this small foot
          // region; tiny edge jitter is not a stride. Old mage/ranger art fails.
          if (changed < 52) failures.push(`${names[i]} ${col} insufficient stride`);
        }
      }
    });
    const preview = document.createElement("canvas");
    preview.width = 800;
    preview.height = 760;
    const out = preview.getContext("2d")!;
    out.imageSmoothingEnabled = false;
    const frames: string[] = [];
    for (const row of [0, ...walks]) {
      out.fillStyle = "#202a25";
      out.fillRect(0, 0, 800, 760);
      out.font = "18px sans-serif";
      out.textAlign = "center";
      out.fillStyle = "#efdfbe";
      ["Down", "Up", "Left", "Right"].forEach((label, i) => out.fillText(label, 170 + i * 175, 30));
      images.forEach((image, i) => {
        out.textAlign = "left";
        out.fillText(names[i], 8, 125 + i * 175);
        for (let col = 0; col < 4; col++)
          out.drawImage(image, col * 64, row * 64, 64, 64, 95 + col * 175, 40 + i * 175, 160, 160);
      });
      frames.push(preview.toDataURL().split(",")[1]);
    }
    return { failures, frames };
  });
  expect(result.failures).toEqual([]);
  for (const [i, png] of result.frames.entries())
    await writeFile(`test-results/player-pose-${i}.png`, Buffer.from(png, "base64"));
});

test("class movement page shows every direction and supports gait inspection", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?class-movement");
  const canvas = page.getByLabel("All classes walking in four directions");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const first = await canvas.getAttribute("data-frame");
  await expect.poll(() => canvas.getAttribute("data-frame")).not.toBe(first);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByLabel("Travel", { exact: true }).uncheck();
  await expect(canvas).toHaveAttribute("data-travel", "false");
  const pausedFrame = await canvas.getAttribute("data-frame");
  await page.waitForTimeout(160);
  await expect(canvas).toHaveAttribute("data-frame", pausedFrame!);
  const seen = new Set<string>();
  for (let frame = 0; frame < 6; frame++) {
    const previous = await canvas.getAttribute("data-frame");
    await page.getByRole("button", { name: "Next frame" }).click();
    await expect.poll(() => canvas.getAttribute("data-frame")).not.toBe(previous);
    seen.add((await canvas.getAttribute("data-frame"))!);
    await canvas.screenshot({ path: `test-results/class-movement-${frame}.png` });
  }
  expect(seen.size).toBe(6);
  await page.getByLabel("Speed", { exact: true }).selectOption("0.5");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByLabel("Travel", { exact: true }).check();
  await expect(canvas).toHaveAttribute("data-travel", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/class-movement-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
