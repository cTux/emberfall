import { test, expect } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

async function drag(page: Page, handle: Locator, dx: number, dy: number) {
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 20 + dx, box.y + 15 + dy, { steps: 5 });
  await page.mouse.up();
}

test("HUD surfaces match and draggable panels and windows persist across sessions", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Panel hero");
  const lobby = page.getByRole("region", { name: "Emberfall", exact: true });
  await drag(page, lobby.getByRole("heading", { name: "Emberfall" }), 90, 30);
  const lobbyTransform = await lobby.evaluate((element) => element.style.transform);
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  const dps = page.getByLabel("Damage per second", { exact: true });
  await expect(dps).toBeVisible();
  const fps = page.locator(".performance-stats");
  const surface = fps.getByLabel("Performance monitor");
  await expect(surface).toHaveCSS("background-color", "rgba(16, 28, 23, 0.85)");
  await expect(dps).toHaveCSS("background-color", "rgba(16, 28, 23, 0.85)");
  await expect(page.getByRole("article", { name: "Panel hero", exact: true })).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  const hp = page.getByRole("progressbar", { name: "Panel hero HP" });
  await expect(hp).toHaveCSS("background-color", "rgb(25, 40, 32)");
  await expect(hp.locator(".MuiLinearProgress-bar")).toHaveCSS("opacity", "1");
  const fill = await hp
    .locator(".MuiLinearProgress-bar")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(fill).not.toMatch(/rgba|\/\s*0\./);
  const manaFill = await page
    .getByRole("progressbar", { name: "Panel hero MP" })
    .locator(".MuiLinearProgress-bar")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(fill).not.toBe(manaFill);
  await drag(page, fps, 430, 70);
  await drag(page, dps, 410, 100);
  const fpsTransform = await fps.evaluate((element) => element.style.transform);
  const dpsTransform = await dps.evaluate((element) => element.style.transform);
  expect(fpsTransform).toBe("translate(430px, 70px)");
  expect(dpsTransform).toBe("translate(410px, 100px)");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await drag(page, settings.getByRole("heading", { name: "Settings" }), 120, 60);
  const settingsTransform = await settings.evaluate((element) => element.style.transform);
  await page.getByRole("button", { name: "Close Settings" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(settings).toHaveCSS("transform", "matrix(1, 0, 0, 1, 120, 60)");
  await page.getByRole("button", { name: "Close Settings" }).click();
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(lobby).toBeVisible();
  const context = await browser.newContext({ storageState: await page.context().storageState() });
  await page.close();
  const next = await context.newPage();
  await next.goto("/");
  await expect
    .poll(() =>
      next
        .getByRole("region", { name: "Emberfall", exact: true })
        .evaluate((element) => element.style.transform),
    )
    .toBe(lobbyTransform);
  await expect
    .poll(() => next.locator(".performance-stats").evaluate((element) => element.style.transform))
    .toBe(fpsTransform);
  await next.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(next.getByLabel("Damage per second", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      next
        .getByLabel("Damage per second", { exact: true })
        .evaluate((element) => element.style.transform),
    )
    .toBe(dpsTransform);
  await next.getByRole("button", { name: "Settings", exact: true }).click();
  await expect
    .poll(() =>
      next
        .getByRole("dialog", { name: "Settings", exact: true })
        .evaluate((element) => element.style.transform),
    )
    .toBe(settingsTransform);
  await next.getByRole("button", { name: "Close Settings" }).click();
  await next.setViewportSize({ width: 390, height: 844 });
  for (const panel of [
    next.locator(".performance-stats"),
    next.getByLabel("Damage per second", { exact: true }),
  ]) {
    await expect
      .poll(async () => {
        const box = (await panel.boundingBox())!;
        return box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844;
      })
      .toBe(true);
  }
  await next.screenshot({ path: "test-results/hud-panels-narrow.png" });
  await context.close();
});

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
  await next.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(next.getByRole("progressbar", { name: "Persistent hero HP" })).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(next.getByRole("progressbar", { name: "Persistent hero MP" })).toHaveAttribute(
    "aria-valuemax",
    "50",
  );
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
    await expect(next.getByLabel("Damage per second", { exact: true })).toContainText("0 DPS");
    const dot = await next.getByRole("status", { name: "World server online" }).boundingBox();
    expect(dot!.x + dot!.width).toBe(viewport.width - 16);
    expect(dot!.y + dot!.height).toBe(viewport.height - 16);
    await next.screenshot({ path: `test-results/hud-${viewport.width}.png` });
  }
  await next.getByRole("button", { name: "Codex", exact: true }).click();
  await expect(next.getByRole("dialog")).toContainText(
    "Trees, buildings and torch posts block movement",
  );
  await next.keyboard.press("Escape");
  await expect(next.getByRole("dialog")).not.toBeVisible();
  await next.mouse.move(200, 400);
  await expect(next.getByRole("tooltip")).not.toBeVisible();
  await next.getByRole("button", { name: "Settings", exact: true }).click();
  await next.getByRole("tab", { name: "Graphics", exact: true }).click();
  await next.getByLabel("Ambient particles").uncheck();
  await expect(next.getByLabel("Ambient particles")).not.toBeChecked();
  await next.getByRole("button", { name: /^Close / }).click();
  await next.getByRole("button", { name: "Leave world" }).click();
  await next.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(next.getByLabel("Your adventurer name")).toHaveValue("Persistent hero");
  await context.close();
});
