import { test, expect } from "@playwright/test";

test("nickname persists in a new session, viewport is full, party bars and controls work", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Persistent hero");
  const storageState = await page.context().storageState();
  const context = await browser.newContext({ storageState });
  const next = await context.newPage();
  await next.goto("/");
  await expect(next.getByLabel("Your adventurer name")).toHaveValue("Persistent hero");
  await next.getByRole("tab", { name: "Create a world" }).click();
  await next.getByRole("button", { name: "Light the ember" }).click();
  await expect(
    next.getByRole("progressbar", { name: "Persistent hero hitpoints" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await expect(
    next.getByRole("progressbar", { name: "Persistent hero manapoints" }),
  ).toHaveAttribute("aria-valuemax", "50");
  await expect(next.getByText("Lv. 1")).toBeVisible();
  await expect(next.locator("header, footer")).toHaveCount(0);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await next.setViewportSize(viewport);
    await expect(next.locator("canvas")).toHaveCSS("width", `${viewport.width}px`);
    await expect(next.locator("canvas")).toHaveCSS("height", `${viewport.height}px`);
    const graph = await next.locator(".performance-stats").boundingBox();
    const dps = await next.getByLabel("Damage per second", { exact: true }).boundingBox();
    const party = await next.locator(".party").boundingBox();
    expect(dps!.y).toBeGreaterThanOrEqual(graph!.y + graph!.height);
    expect(party!.y).toBeGreaterThanOrEqual(dps!.y + dps!.height);
    await expect(next.getByLabel("Damage per second", { exact: true })).toContainText("0.0 DPS");
    const dot = await next.getByRole("status", { name: "World server online" }).boundingBox();
    expect(dot!.x).toBeGreaterThan(viewport.width - 40);
    expect(dot!.y).toBeGreaterThan(viewport.height - 40);
    await next.screenshot({ path: `test-results/hud-${viewport.width}.png` });
  }
  await next.getByRole("button", { name: "Codex", exact: true }).click();
  await expect(next.getByRole("dialog")).toContainText(
    "Trees, buildings and torch posts block movement",
  );
  await next.keyboard.press("Escape");
  await expect(next.getByRole("dialog")).not.toBeVisible();
  await next.getByRole("button", { name: "Settings", exact: true }).click();
  await next.getByRole("tab", { name: "Graphics", exact: true }).click();
  await next.getByLabel("Ambient particles").uncheck();
  await expect(next.getByLabel("Ambient particles")).not.toBeChecked();
  await next.getByRole("button", { name: "Close menu" }).click();
  await next.getByRole("button", { name: "Leave world" }).click();
  await next.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(next.getByLabel("Your adventurer name")).toHaveValue("Persistent hero");
  await context.close();
});
