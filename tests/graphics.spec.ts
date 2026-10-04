import { test, expect } from "./fixtures";

test("legacy reflection settings are ignored and dropped when graphics are saved", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "emberfall.graphics",
      JSON.stringify({ reflections: true, shadows: false }),
    );
  });
  await page.goto("/");
  await expect(page.locator('canvas[aria-label="Forest preview"]')).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await expect(page.getByLabel("Volumetric fog (2D)", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Reflections (2D)", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Soft shadows")).not.toBeChecked();
  for (const preset of ["Low", "Balanced", "High"]) {
    await page.getByRole("button", { name: preset, exact: true }).click();
    await expect(page.getByLabel("Volumetric fog (2D)", { exact: true })).not.toBeChecked();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("emberfall.graphics")!)),
    ).not.toHaveProperty("reflections");
  }
});

test("settings keep compact dimensions across tabs and scroll options internally", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  for (const tab of ["Gameplay", "Graphics", "Sound"]) {
    await dialog.getByRole("tab", { name: tab, exact: true }).click();
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBe(400);
    expect(box.height).toBe(420);
    await expect(dialog.getByRole("heading", { name: "Settings" })).toBeVisible();
  }
  await dialog.getByRole("tab", { name: "Graphics", exact: true }).click();
  const content = dialog.locator(".MuiDialogContent-root");
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  const titleBefore = (await dialog.getByRole("heading", { name: "Settings" }).boundingBox())!;
  await dialog.getByRole("combobox", { name: "Render resolution" }).scrollIntoViewIfNeeded();
  expect(await content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect((await dialog.getByRole("heading", { name: "Settings" }).boundingBox())!.y).toBe(
    titleBefore.y,
  );
  await page.screenshot({ path: "test-results/settings-compact-desktop.png" });
  await page.setViewportSize({ width: 390, height: 360 });
  const small = (await dialog.boundingBox())!;
  expect(small.width).toBeLessThanOrEqual(358);
  expect(small.height).toBeLessThanOrEqual(328);
  await expect(dialog.getByRole("button", { name: "Close Settings" })).toBeVisible();
  await page.screenshot({ path: "test-results/settings-compact-short.png" });
  await dialog.getByRole("button", { name: "Close Settings" }).click();
  await expect(dialog).toBeHidden();
});

test("graphics presets change rendering, individual controls persist, and character key survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem("emberfall.character"));
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Floating damage numbers")).toBeVisible();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await page.getByRole("button", { name: "Low", exact: true }).click();
  await expect(page.getByLabel("Soft shadows")).not.toBeChecked();
  await expect(page.getByLabel("Waving grass and trees")).not.toBeChecked();
  await page.getByRole("button", { name: /^Close / }).click();
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
  await page.getByRole("button", { name: /^Close / }).click();
  await expect
    .poll(() => page.locator("canvas").evaluate((el) => (el as HTMLCanvasElement).width))
    .toBe(lowWidth * 1.5);
  await page.screenshot({ path: "test-results/graphics-high.png" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Character motion blur").uncheck();
  await page.getByLabel("Waving grass and trees").uncheck();
  await page.getByRole("button", { name: /^Close / }).click();
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("emberfall.character"))).toBe(token);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await expect(page.getByLabel("Character motion blur")).not.toBeChecked();
  await expect(page.getByLabel("Waving grass and trees")).not.toBeChecked();
  await expect(page.getByLabel("Dense grass clusters")).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Render resolution" })).toHaveText(
    "150% · Supersampling",
  );
  await page.getByRole("button", { name: /^Close / }).click();
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("emberfall.character"))).toBe(token);
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
});
