import { test, expect } from "@playwright/test";

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test("world labels wrap long multilingual chat and pass input through", async ({ page }) => {
  await page.goto(story("components-worldlabel--long-chat"));
  const label = page.locator('[data-kind="chat"]').first();
  await expect(label).toContainText("Привіт!");
  await expect(label).toHaveCSS("pointer-events", "none");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 700 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/world-label-${width}.png` });
  }
});

test("wardrobe keeps one row and independent keyboard and touch details", async ({ page }) => {
  await page.goto(story("screens-compositions--wardrobe"));
  const ranger = page.getByRole("button", { name: "Ranger select" });
  await ranger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Ranger selected" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const spell = page.getByRole("button", { name: "Base spell for Ranger: Piercing arrows" });
  await spell.focus();
  await expect(page.getByRole("tooltip")).toContainText("Cooldown: 0.7 seconds");
  await spell.blur();
  await expect(page.getByRole("tooltip")).toBeHidden();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const tops = await page
      .getByRole("article")
      .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await spell.dispatchEvent("touchstart", { touches: [{ identifier: 1 }] });
  await expect(page.getByRole("tooltip")).toContainText("Piercing arrows");
  await spell.dispatchEvent("touchend", { touches: [] });
});

test("connection states use colored circles without visible text", async ({ page }) => {
  await page.goto(story("components-game-patterns--connection"));
  for (const [name, color] of [
    ["World server online", "rgb(131, 203, 163)"],
    ["World server connecting", "rgb(230, 190, 128)"],
    ["World server disconnected", "rgb(239, 155, 133)"],
  ]) {
    const indicator = page.getByRole("status", { name });
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText("");
    await expect(indicator).toHaveCSS("background-color", color);
    await expect(indicator).toHaveCSS("border-radius", "50%");
    await expect(indicator).toHaveCSS("width", "10px");
    await expect(indicator).toHaveCSS("height", "10px");
  }
});

test("lobby supports locked worlds and create form", async ({ page }) => {
  await page.goto(story("screens-compositions--lobby"));
  await expect(page.getByRole("tab", { name: "Join a world" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Join a world" })).toHaveCount(0);
  await expect(page.getByText("Worlds fade when the last adventurer leaves.")).toHaveCount(0);
  await page.getByLabel("Your adventurer name").fill("Astrid");
  await expect(page.getByRole("button", { name: "Join Full world, full" })).toBeDisabled();
  await page.getByRole("button", { name: "Join Northern grove, password protected" }).click();
  await page.getByLabel("Password for Northern grove").fill("password");
  await page.getByRole("button", { name: "Join world", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("password submitted");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("textbox", { name: "World name", exact: true }).fill("Test grove");
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("alert")).toContainText("create Test grove");
});

test("dialog closes with Escape, restores focus and drags", async ({ page }) => {
  await page.goto(story("components-game-patterns--window"));
  const trigger = page.getByRole("button", { name: "Open window" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Forest portal" });
  await expect(dialog).toBeVisible();
  const before = (await dialog.boundingBox())!;
  const title = (await dialog.getByText("Forest portal", { exact: true }).boundingBox())!;
  await page.mouse.move(title.x + 40, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x + 90, title.y + 45, { steps: 5 });
  await page.mouse.up();
  const after = (await dialog.boundingBox())!;
  expect(after.x).toBeGreaterThan(before.x + 30);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("tabs, settings and voting support keyboard and callbacks", async ({ page }) => {
  await page.goto(story("components-game-patterns--chapters"));
  await page.getByRole("tab", { name: "Controls" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tabpanel", { name: "Combat" })).toBeVisible();
  await page.goto(story("components-game-patterns--settings"));
  await page.getByRole("switch", { name: "Sound effects" }).uncheck();
  await expect(page.getByRole("slider", { name: "Effects volume" })).toBeDisabled();
  await page.goto(story("components-game-patterns--vote"));
  await page.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByRole("heading", { name: "Forest · Easy (2/2 ready)" })).toBeVisible();
  await page.getByRole("button", { name: "Retract ready vote" }).click();
  await expect(page.getByRole("heading", { name: "Forest · Easy (1/2 ready)" })).toBeVisible();
});

test("meters expose clamped actual units", async ({ page }) => {
  await page.goto(story("components-game-patterns--meter"));
  const health = page.getByRole("progressbar", { name: "Health" });
  await expect(health).toHaveAttribute("aria-valuenow", "75");
  await expect(health).toHaveAttribute("aria-valuemax", "100");
  await expect(page.getByRole("progressbar", { name: "Invalid maximum" })).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  const fractional = page.getByRole("progressbar", { name: "Fractional" });
  await expect(fractional).toHaveAttribute("aria-valuenow", "75.6");
  await expect(fractional).toHaveAttribute("aria-valuemax", "100.4");
  await expect(fractional).toHaveAttribute("aria-valuetext", "76 / 100");
  await expect(page.getByText("76 / 100", { exact: true })).toBeVisible();
});

test("performance and volume labels round without changing their underlying values", async ({
  page,
}) => {
  await page.goto(story("components-game-patterns--performance"));
  await expect(page.getByLabel("Frame rate", { exact: true })).toHaveText("60 FPS");
  await expect(page.getByLabel("Server latency", { exact: true })).toHaveText("33 ms");
  await page.goto(story("components-game-patterns--settings"));
  const volume = page.getByRole("slider", { name: "Effects volume" });
  await volume.focus();
  await page.keyboard.press("ArrowRight");
  await expect(volume).toHaveAttribute("aria-valuenow", "0.65");
  await expect(volume).toHaveAttribute("aria-valuetext", "65%");
  await expect(page.getByText("65%", { exact: true })).toBeVisible();
});

test("all stories render; desktop and narrow screens fit", async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const index = await (await request.get("/index.json")).json();
  for (const entry of Object.values(index.entries) as { id: string; type: string }[]) {
    if (entry.type !== "story") continue;
    await page.goto(story(entry.id));
    await expect(page.locator("#storybook-root > *").first()).toBeAttached();
    await expect(page.locator(".sb-errordisplay")).toBeHidden();
  }
  expect(errors).toEqual([]);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of [
      "lobby",
      "settings",
      "wardrobe",
      "codex",
      "hud",
      "portal",
      "confirmation",
      "fallen",
      "service",
    ]) {
      await page.goto(story(`screens-compositions--${name}`));
      await expect(page.locator("#storybook-root > *").first()).toBeAttached();
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  }
  await page.goto("/iframe.html?id=guide-build-and-reuse--docs&viewMode=docs");
  await expect(page.getByText("Create a component", { exact: true })).toBeVisible();
});
