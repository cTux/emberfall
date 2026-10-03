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

test("two browsers create, reject wrong password, join, transfer host and clean up", async ({
  browser,
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Join a world" })).toHaveCount(0);
  await expect(page.getByText("Worlds fade when the last adventurer leaves.")).toHaveCount(0);
  await page.screenshot({ path: "test-results/lobby-desktop.png" });
  await page.getByLabel("Your adventurer name").fill("Astrid");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("textbox", { name: "World name", exact: true }).fill("Northern lights");
  await page.getByLabel("Password (optional)").fill("embers");
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("complementary", { name: /Northern lights/ })).toBeVisible();
  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto("/");
  await guest.getByLabel("Your adventurer name").fill("Bjorn");
  await guest.getByRole("button", { name: /Northern lights/ }).click();
  await guest.getByLabel("Password for Northern lights").fill("wrong");
  await guest.getByRole("button", { name: "Join world" }).click();
  await expect(guest.getByRole("alert")).toContainText("Incorrect world password");
  await guest.getByLabel("Password for Northern lights").fill("embers");
  await guest.getByRole("button", { name: "Join world" }).click();
  await expect(page.getByRole("complementary", { name: /2\/8 adventurers/ })).toBeVisible();
  await expect(guest.getByText("Astrid", { exact: false }).first()).toBeVisible();
  await guest.keyboard.down("d");
  await guest.waitForTimeout(400);
  await guest.keyboard.up("d");
  await guest.screenshot({ path: "test-results/shared-world.png" });
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(guest.getByRole("complementary", { name: /1\/8 adventurers/ })).toBeVisible();
  await expect(guest.getByLabel("Host", { exact: true })).toBeVisible();
  await guest.getByRole("button", { name: "Leave world" }).click();
  await guest.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByRole("button", { name: /New Permanent World.*0\/8/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Northern lights/ })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/lobby-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await context.close();
});

test("open worlds join without a password, reload preserves the party, and leaving cleans up", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("textbox", { name: "World name", exact: true }).fill("Open grove");
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("complementary", { name: /Open grove/ })).toBeVisible();
  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto("/");
  await guest.getByRole("button", { name: /Open grove/ }).click();
  await expect(guest.getByRole("complementary", { name: /2\/8 adventurers/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("complementary", { name: /2\/8 adventurers/ })).toBeVisible();
  await expect(page.getByLabel("Host", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(guest.getByRole("complementary", { name: /1\/8 adventurers/ })).toBeVisible();
  await expect(guest.getByLabel("Host", { exact: true })).toBeVisible();
  await guest.getByRole("button", { name: "Leave world" }).click();
  await guest.getByRole("button", { name: "Leave", exact: true }).click();
  await context.close();
  await expect(page.getByRole("button", { name: /New Permanent World.*0\/8/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open grove/ })).toHaveCount(0);
});

test("the permanent world is public, shared and remains joinable after everyone leaves", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /New Permanent World.*0\/8/ }).click();
  await expect(page.getByRole("complementary", { name: /New Permanent World/ })).toBeVisible();
  const context = await browser.newContext();
  try {
    const guest = await context.newPage();
    await guest.goto("/");
    await guest.getByRole("button", { name: /New Permanent World.*1\/8/ }).click();
    await expect(guest.getByRole("complementary", { name: /2\/8 adventurers/ })).toBeVisible();
    await page.getByRole("button", { name: "Leave world" }).click();
    await page.getByRole("button", { name: "Leave", exact: true }).click();
    await expect(guest.getByLabel("Host", { exact: true })).toBeVisible();
    await guest.getByRole("button", { name: "Leave world" }).click();
    await guest.getByRole("button", { name: "Leave", exact: true }).click();
    await context.close();
    await page.getByRole("button", { name: /New Permanent World.*0\/8/ }).click();
    await expect(page.getByRole("complementary", { name: /1\/8 adventurers/ })).toBeVisible();
    await expect(page.getByLabel("Host", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
