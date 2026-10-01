import { test, expect } from "@playwright/test";

test("graphics presets change rendering, individual controls persist, and character key survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem("emberfall.character"));
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Floating damage numbers")).toBeVisible();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await page.getByRole("button", { name: "Low", exact: true }).click();
  await expect(page.getByLabel("Soft shadows")).not.toBeChecked();
  await expect(page.getByLabel("Waving grass and trees")).not.toBeChecked();
  await page.getByRole("button", { name: "Close menu" }).click();
  await page.screenshot({ path: "test-results/graphics-low.png" });
  const lowWidth = await page.locator("canvas").evaluate((el) => (el as HTMLCanvasElement).width);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "High", exact: true }).click();
  for (const label of [
    "Ambient occlusion (2D)",
    "Soft shadows",
    "Dense grass clusters",
    "Waving grass and trees",
    "Character motion blur",
    "Dynamic lighting",
    "Bloom",
    "Ambient particles",
  ])
    await expect(page.getByLabel(label, { exact: true })).toBeChecked();
  await page.screenshot({ path: "test-results/graphics-settings.png" });
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect
    .poll(() => page.locator("canvas").evaluate((el) => (el as HTMLCanvasElement).width))
    .toBe(lowWidth * 1.5);
  await page.screenshot({ path: "test-results/graphics-high.png" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Character motion blur").uncheck();
  await page.getByLabel("Waving grass and trees").uncheck();
  await page.getByRole("button", { name: "Close menu" }).click();
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("emberfall.character"))).toBe(token);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await expect(page.getByLabel("Character motion blur")).not.toBeChecked();
  await expect(page.getByLabel("Waving grass and trees")).not.toBeChecked();
  await expect(page.getByLabel("Dense grass clusters")).toBeChecked();
  await expect(page.getByLabel("Render resolution")).toHaveValue("1.5");
  await page.getByRole("button", { name: "Close menu" }).click();
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("emberfall.character"))).toBe(token);
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
});
