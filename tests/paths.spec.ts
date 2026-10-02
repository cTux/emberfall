import { test, expect } from "@playwright/test";
import { BUILDINGS, PATHS, TRAINING_ZONES } from "../packages/common/src/index";

test("village dirt tiles connect every doorway and leave training clear", async ({ page }) => {
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
      apply(target, context, args) {
        const image = args[0];
        if (image instanceof HTMLImageElement && image.src.endsWith("/floor.png")) {
          const tiles = JSON.parse(document.body.dataset.pathTiles || "[]") as number[][];
          const x = Math.floor(args[5] / 32),
            y = Math.floor(args[6] / 32);
          if (!tiles.some(([tx, ty]) => tx === x && ty === y)) tiles.push([x, y]);
          document.body.dataset.pathTiles = JSON.stringify(tiles);
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
  const tiles = await page.evaluate(
    () => JSON.parse(document.body.dataset.pathTiles!) as number[][],
  );
  const cells = new Set(tiles.map(([x, y]) => `${x},${y}`));
  for (const point of PATHS.flat()) {
    expect(
      cells.has(`${Math.floor(point.x / 32)},${Math.floor(point.y / 32)}`),
      `Path must reach (${point.x}, ${point.y})`,
    ).toBe(true);
  }
  for (const building of BUILDINGS) {
    expect(
      cells.has(`${Math.floor(building.x / 32)},${Math.floor((building.y + 15) / 32)}`),
      `${building.name} doorway`,
    ).toBe(true);
  }
  const queue = [[15, 11]];
  const connected = new Set(["15,11"]);
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
  expect(connected.size, "Every dirt tile belongs to one connected village network").toBe(
    cells.size,
  );
  for (const zone of TRAINING_ZONES) {
    expect(cells.has(`${Math.floor(zone.x / 32)},${Math.floor(zone.y / 32)}`)).toBe(false);
  }
  await page.screenshot({ path: "test-results/village-paths.png" });
});
