import { test, expect } from "./fixtures";
test.use({ graphicsPreset: "High" });

test("High graphics uses viewport-sized WebGL with bounded cached resources", async ({
  page,
  browser,
}, testInfo) => {
  const session = await browser.newBrowserCDPSession();
  const system = await session.send("SystemInfo.getInfo");
  await session.detach();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "pixijs-webgl");
  expect(
    await canvas.evaluate((canvas: HTMLCanvasElement) => ({
      width: canvas.width,
      height: canvas.height,
      canvas2d: !!canvas.getContext("2d"),
    })),
  ).toEqual({ width: 2160, height: 1500, canvas2d: false });
  await page.waitForTimeout(3000);
  const timing = await page.evaluate(
    () =>
      new Promise<{ frames: number; averageMs: number; p95Ms: number }>((resolve) => {
        const intervals: number[] = [];
        let last = performance.now();
        const start = last;
        function frame(now: number) {
          intervals.push(now - last);
          last = now;
          if (now - start < 3000) requestAnimationFrame(frame);
          else {
            const sorted = [...intervals].sort((a, b) => a - b);
            resolve({
              frames: intervals.length,
              averageMs: intervals.reduce((sum, n) => sum + n, 0) / intervals.length,
              p95Ms: sorted[Math.floor(sorted.length * 0.95)],
            });
          }
        }
        requestAnimationFrame(frame);
      }),
  );
  const stats = JSON.parse((await canvas.getAttribute("data-render-stats"))!);
  expect(stats.textures).toBeLessThan(150);
  expect(stats.gradients).toBeLessThan(150);
  expect(stats.visuals).toBeLessThan(5000);
  expect(timing.frames).toBeGreaterThan(5);
  console.log("High preview renderer measurement", JSON.stringify({ timing, stats }));
  await testInfo.attach("renderer-measurement", {
    body: JSON.stringify(
      {
        browser: browser.version(),
        gpu: system.gpu,
        viewport: page.viewportSize(),
        preset: "High",
        warmupMs: 3000,
        sampleMs: 3000,
        timing,
        stats,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await page.screenshot({ path: "test-results/new-pixi-high-preview.png" });
  expect(errors).toEqual([]);
});
