import { test, expect } from "@playwright/test";
test("two browsers create, reject wrong password, join, transfer host and clean up", async ({
  browser,
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
  await page.screenshot({ path: "test-results/lobby-desktop.png" });
  await page.getByLabel("Your adventurer name").fill("Astrid");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByLabel("World name", { exact: true }).fill("Northern lights");
  await page.getByLabel("Password optional").fill("embers");
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

test("open worlds join without a password and closing browsers cleans up", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByLabel("World name", { exact: true }).fill("Open grove");
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("complementary", { name: /Open grove/ })).toBeVisible();
  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto("/");
  await guest.getByRole("button", { name: /Open grove/ }).click();
  await expect(guest.getByRole("complementary", { name: /2\/8 adventurers/ })).toBeVisible();
  await page.reload();
  await expect(guest.getByRole("complementary", { name: /1\/8 adventurers/ })).toBeVisible();
  await expect(guest.getByLabel("Host", { exact: true })).toBeVisible();
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
    await context.close();
    await page.getByRole("button", { name: /New Permanent World.*0\/8/ }).click();
    await expect(page.getByRole("complementary", { name: /1\/8 adventurers/ })).toBeVisible();
    await expect(page.getByLabel("Host", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
