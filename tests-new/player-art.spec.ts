import { test, expect } from "./fixtures";
import { writeFile } from "node:fs/promises";

test("all player poses have safe cell gutters and six distinct walking images", async ({
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
        const distinct = new Set<string>();
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
          if (walks.includes(row)) distinct.add(tile.toDataURL());
        }
        if (distinct.size !== 6) failures.push(`${names[i]} ${col} repeated gait`);
      }
    });
    const preview = document.createElement("canvas");
    preview.width = 800;
    preview.height = 760;
    const out = preview.getContext("2d")!;
    out.imageSmoothingEnabled = false;
    const frames: string[] = [];
    for (const row of walks) {
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
    await writeFile(`test-results/player-walk-${i}.png`, Buffer.from(png, "base64"));
});
