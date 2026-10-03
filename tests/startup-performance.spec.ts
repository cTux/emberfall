import { test, expect } from "@playwright/test";

test("cold assets, joining and reload prepare the village once and draw only visible ground", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const stats = { canvases: 0, paints: 0, wholeMapDraws: 0, frames: [] as number[] };
    (window as unknown as { startupStats: typeof stats }).startupStats = stats;
    const create = document.createElement.bind(document);
    document.createElement = new Proxy(create, {
      apply(target, context, args) {
        if (args[0] === "canvas") stats.canvases++;
        return Reflect.apply(target, context, args);
      },
    });
    const prototype = CanvasRenderingContext2D.prototype;
    prototype.fillRect = new Proxy(prototype.fillRect, {
      apply(target, context, args) {
        if (args[2] === 4800 && args[3] === 2560 && context.canvas.width === 4800) stats.paints++;
        return Reflect.apply(target, context, args);
      },
    });
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(target, context, args) {
        const image = args[0];
        if (
          context.canvas.hasAttribute("aria-label") &&
          image instanceof HTMLCanvasElement &&
          image.width === 4800 &&
          image.height === 2560 &&
          args.length !== 9
        )
          stats.wholeMapDraws++;
        return Reflect.apply(target, context, args);
      },
    });
    let previous = 0;
    function sample(now: number) {
      if (previous) stats.frames.push(now - previous);
      previous = now;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.route("**/assets/{nature,floor,houses,wardrobe}.png", async (route) => {
    await new Promise((resolve) =>
      setTimeout(resolve, route.request().url().includes("floor") ? 600 : 100),
    );
    await route.continue();
  });
  const stats = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            startupStats: {
              canvases: number;
              paints: number;
              wholeMapDraws: number;
              frames: number[];
            };
          }
        ).startupStats,
    );
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.waitForTimeout(1500);
  const joined = await stats();
  console.log(
    "Startup rendering:",
    JSON.stringify({
      ...joined,
      frames: undefined,
      p95: joined.frames.toSorted((a, b) => a - b)[Math.floor(joined.frames.length * 0.95)],
      worst: Math.max(...joined.frames),
    }),
  );
  expect(joined.paints).toBe(1);
  expect(joined.canvases).toBeLessThan(100);
  expect(joined.wholeMapDraws).toBe(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await page.getByLabel("Waving grass and trees").uncheck();
  await page.getByRole("button", { name: "Close Settings" }).click();
  await page.waitForTimeout(150);
  expect((await stats()).paints).toBe(1);
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.waitForTimeout(150);
  expect((await stats()).paints).toBe(1);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await page.getByLabel("Dense grass clusters").uncheck();
  await page.getByRole("button", { name: "Close Settings" }).click();
  await expect.poll(async () => (await stats()).paints).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.waitForTimeout(1000);
  const reloaded = await stats();
  expect(reloaded.paints).toBe(1);
  expect(reloaded.canvases).toBeLessThan(100);
  expect(reloaded.wholeMapDraws).toBe(0);
});
