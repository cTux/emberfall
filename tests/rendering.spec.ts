import { test, expect } from "@playwright/test";

interface RenderCapture {
  sprites: { x: number; y: number }[];
  label?: { text: string; textWidth: number; boxWidth: number };
}
declare global {
  interface Window {
    renderCapture: RenderCapture;
  }
}

test("walking keeps direction, advances frames, and fits the full nickname", async ({ page }) => {
  await page.addInitScript(() => {
    window.renderCapture = { sprites: [] };
    const boxes = new WeakMap<CanvasRenderingContext2D, number>();
    const prototype = CanvasRenderingContext2D.prototype;
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLImageElement && args[0].src.endsWith("/knight.png")) {
          window.renderCapture.sprites.push({ x: args[1], y: args[2] });
          if (window.renderCapture.sprites.length > 120) window.renderCapture.sprites.shift();
        }
        return Reflect.apply(target, context, args);
      },
    });
    prototype.fillRect = new Proxy(prototype.fillRect, {
      apply(target, context, args) {
        if (args[3] === 14) boxes.set(context, args[2]);
        return Reflect.apply(target, context, args);
      },
    });
    prototype.fillText = new Proxy(prototype.fillText, {
      apply(target, context, args) {
        if (context.font === "8px system-ui")
          window.renderCapture.label = {
            text: args[0],
            textWidth: context.measureText(args[0]).width,
            boxWidth: boxes.get(context) ?? 0,
          };
        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto("/");
  const name = "A very long adventurer";
  await page.getByLabel("Your adventurer name").fill(name);
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.renderCapture.label?.text)).toBe(name);
  const label = await page.evaluate(() => window.renderCapture.label!);
  expect(label.boxWidth).toBe(Math.max(40, Math.ceil(label.textWidth) + 12));
  for (const [key, column] of [
    ["d", 48],
    ["w", 16],
    ["a", 32],
    ["s", 0],
  ] as const) {
    await page.keyboard.down(key);
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      window.renderCapture.sprites = [];
    });
    await page.waitForTimeout(370);
    const frames = await page.evaluate(() => window.renderCapture.sprites);
    expect(frames.length).toBeGreaterThan(3);
    expect([...new Set(frames.map((frame) => frame.x))]).toEqual([column]);
    expect(
      new Set(frames.map((frame) => frame.y)).size,
      `Walking ${key} should animate`,
    ).toBeGreaterThan(2);
    await page.keyboard.up(key);
    await page.waitForTimeout(500);
    const idle = await page.evaluate(() => window.renderCapture.sprites.at(-1));
    expect(idle).toEqual({ x: column, y: 0 });
  }
  await page.keyboard.down("w");
  await page.waitForTimeout(100);
  await page.keyboard.down("a");
  await page.waitForTimeout(60);
  await page.evaluate(() => {
    window.renderCapture.sprites = [];
  });
  await page.waitForTimeout(250);
  const diagonal = await page.evaluate(() => window.renderCapture.sprites);
  expect(diagonal.length).toBeGreaterThan(3);
  expect([...new Set(diagonal.map((frame) => frame.x))]).toEqual([16]);
  await page.keyboard.up("a");
  await page.keyboard.up("w");
  await page.screenshot({ path: "test-results/directional-walking.png" });
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
});

test("holding movement into a torch leaves the character still and idle", async ({ page }) => {
  await page.addInitScript(() => {
    window.renderCapture = { sprites: [] };
    const prototype = CanvasRenderingContext2D.prototype;
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLImageElement && args[0].src.endsWith("/knight.png")) {
          window.renderCapture.sprites.push({ x: args[6], y: args[2] });
          if (window.renderCapture.sprites.length > 120) window.renderCapture.sprites.shift();
        }
        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Blocked walker");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  // Spawn is (420, 340); approach the torch at (440, 435) from above.
  await page.keyboard.down("d");
  await page.waitForTimeout(100);
  await page.keyboard.up("d");
  await page.keyboard.down("s");
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    window.renderCapture.sprites = [];
  });
  await page.waitForTimeout(650);
  const frames = await page.evaluate(() => window.renderCapture.sprites);
  expect(frames.length).toBeGreaterThan(3);
  expect(
    Math.max(...frames.map((frame) => frame.x)) - Math.min(...frames.map((frame) => frame.x)),
  ).toBeLessThan(0.01);
  expect([...new Set(frames.map((frame) => frame.y))]).toEqual([0]);
  // The sprite top should still be near the torch, not stopped at the map boundary.
  expect(frames[0].x).toBeGreaterThan(360);
  expect(frames[0].x).toBeLessThan(395);
  await page.screenshot({ path: "test-results/blocked-torch.png" });
  await page.keyboard.up("s");
});
