import { test, expect } from "@playwright/test";
import {
  ARENA,
  BUILDINGS,
  PATHS,
  TRAINING_ZONES,
  WARDROBE,
  onPath,
} from "../packages/common/src/index";

test("curved dirt paths are continuous and reach the sprite doorways", async ({ page }) => {
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
      apply(target, context, args) {
        const image = args[0];
        if (image instanceof HTMLImageElement && image.src.endsWith("/floor.png")) {
          document.body.dataset.pathTexture = JSON.stringify(args.slice(1, 5));
        }
        if (image instanceof HTMLCanvasElement && image.width === 480 && image.height === 320) {
          document.body.dataset.pathImage = image.toDataURL();
          document.body.dataset.pathSmoothing = String(context.imageSmoothingEnabled);
        }
        return Reflect.apply(target, context, args);
      },
    });
  });
  // Exercise the image-load repaint rather than relying on a warm asset cache.
  await page.route("**/assets/floor.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Path visitor");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-path-smoothing", "false");
  await expect(page.locator("body")).toHaveAttribute("data-path-texture", "[192,128,16,16]");
  const { pixels, green } = await page.evaluate(async () => {
    const image = new Image();
    image.src = document.body.dataset.pathImage!;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels: string[] = [];
    let green = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (data[i + 3] < 128) continue;
        pixels.push(`${x},${y}`);
        if (data[i + 1] > data[i]) green++;
      }
    }
    return { pixels, green };
  });
  expect(green, "The entire path layer contains dirt, without green edge pixels").toBe(0);
  const cells = new Set(pixels);
  const covered = (x: number, y: number) => cells.has(`${Math.floor(x / 2)},${Math.floor(y / 2)}`);
  for (const point of [...PATHS.flat(), WARDROBE]) {
    expect(covered(point.x, point.y), `Path must reach (${point.x}, ${point.y})`).toBe(true);
  }
  for (const building of BUILDINGS) {
    expect(covered(building.doorX, building.y), `${building.name} threshold`).toBe(true);
    expect(covered(building.doorX, building.y + 15), `${building.name} approach`).toBe(true);
    // The workshop's entrance is beside the forge; the other doors are at source x=24.
    const spriteDoorX = building.id === "workshop" ? 40 : 24;
    expect(building.doorX).toBe(building.x + spriteDoorX * 2 - building.sourceWidth);
  }
  // Check the whole interior, including bends and joins, rather than just tile centers.
  for (let y = 1; y < ARENA.height; y += 2) {
    for (let x = 1; x < ARENA.width; x += 2) {
      const plaza = Math.hypot((x - 480) / 110, (y - 355) / 75);
      // Leave one pixel of tolerance at the antialiased plaza boundary.
      if (onPath(x, y, 22) && (plaza < 0.97 || plaza > 1))
        expect(covered(x, y), `No dirt hole at ${x},${y}`).toBe(true);
    }
  }
  expect(covered(480, 475), "The curved southern route stays connected").toBe(true);
  expect(covered(400, 550), "The storehouse route bends toward its entrance").toBe(true);
  expect(covered(480, 550), "The old right-angle southern junction is grass again").toBe(false);
  const queue = [[240, 177]];
  const connected = new Set(["240,177"]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const key = `${x + dx},${y + dy}`;
      if (cells.has(key) && !connected.has(key)) {
        connected.add(key);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  expect(connected.size, "All dirt pixels form one connected network").toBe(cells.size);
  for (const zone of TRAINING_ZONES) expect(covered(zone.x, zone.y)).toBe(false);
  await page.screenshot({ path: "test-results/village-paths.png" });
});
