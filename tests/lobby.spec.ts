import { test, expect } from "./fixtures";

test("lobby window drags across the viewport without outer scrollbars", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 700 });
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Emberfall" });
  const before = (await panel.boundingBox())!;
  const title = (await panel.getByRole("heading", { name: "Emberfall" }).boundingBox())!;
  await page.mouse.move(title.x + 30, title.y + 15);
  await page.mouse.down();
  await page.mouse.move(title.x - 170, title.y - 85, { steps: 5 });
  await page.mouse.up();
  const moved = (await panel.boundingBox())!;
  expect(moved.x).toBeCloseTo(before.x - 200, 0);
  expect(moved.y).toBeCloseTo(before.y - 100, 0);
  await expect(page.locator(".lobby")).toHaveCSS("overflow", "visible");
  const movedTitle = (await panel.getByRole("heading", { name: "Emberfall" }).boundingBox())!;
  await page.mouse.move(movedTitle.x + 30, movedTitle.y + 15);
  await page.mouse.down();
  await page.mouse.move(1400, 1000, { steps: 5 });
  await page.mouse.up();
  const edge = (await panel.boundingBox())!;
  expect(edge.x).toBeGreaterThanOrEqual(0);
  expect(edge.y).toBeGreaterThanOrEqual(0);
  expect(edge.x + edge.width).toBeLessThanOrEqual(961);
  expect(edge.y + edge.height).toBeLessThanOrEqual(701);
  await page.screenshot({ path: "test-results/lobby-dragged.png" });
  await panel.getByRole("button", { name: "Close Emberfall" }).click();
  await expect(panel).toBeHidden();
  await page.setViewportSize({ width: 390, height: 240 });
  await page.getByRole("button", { name: "World browser" }).click();
  // ResizeObserver clamps the reopened panel on the next layout pass.
  await expect
    .poll(async () => {
      const box = (await panel.boundingBox())!;
      return box.y + box.height;
    })
    .toBeLessThanOrEqual(240);
  const short = (await panel.boundingBox())!;
  expect(short.y).toBeGreaterThanOrEqual(0);
  expect(short.y + short.height).toBeLessThanOrEqual(240);
  const content = panel.locator(":scope > div").last();
  await expect(content).toHaveCSS("overflow-y", "auto");
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  await expect(panel.getByRole("button", { name: "Close Emberfall" })).toBeVisible();
  await page.screenshot({ path: "test-results/lobby-short-screen.png" });
  await panel.getByRole("button", { name: "Close Emberfall" }).click();
  await expect(panel).toBeHidden();
});

test("server browser shows columns and disables creation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Create a world" })).toBeDisabled();
  await expect(page.getByText(/^Playing as /)).toHaveCount(0);
  for (const name of ["Name", "Latency", "Players"])
    await expect(page.getByRole("columnheader", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("0/32");
  await expect(page.getByRole("table")).toContainText(/\d+ ms/);
  for (const width of [960, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: "test-results/server-browser-narrow.png" });
});

test("the permanent world is public, shared and remains joinable after everyone leaves", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Playtest Default.*0\/32/ }).click();
  await expect(page.getByRole("complementary", { name: /Playtest Default/ })).toBeVisible();
  const context = await browser.newContext();
  try {
    const guest = await context.newPage();
    await guest.goto("/");
    await guest.getByRole("button", { name: /Playtest Default.*1\/32/ }).click();
    await expect(guest.getByRole("complementary", { name: /2\/32 adventurers/ })).toBeVisible();
    await page.getByRole("button", { name: "Leave world" }).click();
    await page.getByRole("button", { name: "Leave", exact: true }).click();
    await expect(guest.getByLabel("Host", { exact: true })).toBeVisible();
    await guest.getByRole("button", { name: "Leave world" }).click();
    await guest.getByRole("button", { name: "Leave", exact: true }).click();
    await context.close();
    await page.getByRole("button", { name: /Playtest Default.*0\/32/ }).click();
    await expect(page.getByRole("complementary", { name: /1\/32 adventurers/ })).toBeVisible();
    await expect(page.getByLabel("Host", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
