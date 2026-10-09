import { test, expect } from "@playwright/test";

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test("party bars use sixty percent of their old width with compact coins immediately after", async ({
  page,
}, testInfo) => {
  for (const [variant, amount, compact] of [
    ["playground", 13, "13"],
    ["thousands", 1000, "1k"],
    ["millions", 3000000, "3m"],
  ] as const) {
    await page.goto(story(`components-partycard--${variant}`));
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const meter = page.getByRole("progressbar", { name: "Astrid, lvl 1" });
      const coins = page.getByLabel(`Astrid: ${amount} coins`, { exact: true });
      await expect(coins).toHaveText(compact);
      const bar = (await meter.boundingBox())!;
      const available = await meter
        .locator("../../..")
        .evaluate((element) => element.getBoundingClientRect().width);
      expect(bar.width).toBeCloseTo(available * 0.6, 0);
      const balance = (await coins.boundingBox())!;
      expect(balance.x).toBeCloseTo(bar.x + bar.width + 8, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath(`coins-${variant}-${width}.png`) });
    }
  }
});

test("companion health sits beneath the player at desktop and narrow widths", async ({
  page,
}, testInfo) => {
  await page.goto(story("components-partycard--with-companion"));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const player = page.getByRole("progressbar", { name: "Astrid, lvl 1" });
    const companion = page.getByRole("progressbar", { name: "Bear", exact: true });
    await expect(companion).toHaveAttribute("aria-valuenow", "75");
    await expect(companion).toHaveAttribute("aria-valuemax", "150");
    const p = (await player.boundingBox())!;
    const c = (await companion.boundingBox())!;
    expect(c.y).toBeGreaterThanOrEqual(p.y + p.height);
    expect(c.height).toBeLessThan(p.height);
    expect(c.width).toBeLessThan(p.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`companion-${width}.png`) });
  }
  await page.goto(story("components-partycard--defeated-companion"));
  await expect(page.getByRole("progressbar", { name: "Bear", exact: true })).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
});

test("party keeps a single HP row with portrait corner icons", async ({ page }, testInfo) => {
  await page.goto(story("components-partycard--host-away"));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const card = page.getByRole("article");
    const meter = card.getByRole("progressbar", { name: "Astrid, lvl 1" });
    await expect(card.getByRole("progressbar")).toHaveCount(1);
    await expect(card.getByText("Astrid, lvl 1", { exact: true })).toBeVisible();
    await expect(card.getByText("Host", { exact: true })).toHaveCount(0);
    const host = card.getByRole("img", { name: "Host", exact: true });
    const dimension = card.getByRole("img", { name: "In another dimension" });
    const portrait = host.locator("..");
    const p = (await portrait.boundingBox())!;
    const h = (await host.boundingBox())!;
    const d = (await dimension.boundingBox())!;
    const m = (await meter.boundingBox())!;
    expect(p.height).toBe(m.height);
    expect(p.y).toBe(m.y);
    expect(h.y).toBe(p.y);
    expect(d.y).toBe(p.y);
    expect(d.x).toBe(p.x);
    expect(h.x + h.width).toBeCloseTo(p.x + p.width, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`party-${width}.png`) });
  }
});

test.describe("equipment touch badges", () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 800 } });
  test("tap opens the item and an effect explanation", async ({ page }) => {
    await page.goto(story("components-equipmentpanel--starter"));
    await page.getByRole("button", { name: "Weapon: Warrior's sword" }).tap();
    const bleed = page.getByRole("button", { name: "Bleed", exact: true });
    await expect(bleed).toBeVisible();
    await bleed.tap();
    await expect(page.getByRole("tooltip").last()).toContainText("10% chance to apply Bleed");
  });
});

test("equipment exposes borderless slots, keyboard details and narrow stats", async ({ page }) => {
  await page.goto(story("components-equipmentpanel--starter"));
  await expect(page.locator("[data-equipment-slot]")).toHaveCount(9);
  const weapon = page.getByRole("button", { name: "Weapon: Warrior's sword" });
  await weapon.focus();
  await expect(
    page.getByRole("tooltip").getByRole("button", { name: "Critical chance: 5%", exact: true }),
  ).toBeVisible();
  await expect(weapon).toHaveCSS("border-top-width", "0px");
  await weapon.blur();
  await expect(page.getByRole("tooltip")).toBeHidden();
  await page.getByRole("button", { name: "Ring: Empty" }).focus();
  await expect(page.getByRole("tooltip")).toContainText("Accepts: Ring");
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole("button", { name: "Close Equipment" }).focus();
    await page.getByText("Armor", { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByText("Armor", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto(story("components-equipmentpanel--empty"));
  await expect(page.locator('[data-equipped="true"]')).toHaveCount(0);
  await expect(page.locator('[data-equipped="false"]')).toHaveCount(9);
});

test("wardrobe keeps one row and independent keyboard and touch details", async ({ page }) => {
  await page.goto(story("screens-compositions--wardrobe"));
  await expect(page.getByText("Power", { exact: true })).toHaveCount(4);
  await expect(page.getByText("MP", { exact: true })).toHaveCount(0);
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

test("lobby shows server columns, locked worlds and disabled creation", async ({ page }) => {
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
  await expect(page.getByRole("tab", { name: "Create a world" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "World name", exact: true })).toHaveCount(0);
  for (const name of ["Name", "Latency", "Players"])
    await expect(page.getByRole("columnheader", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("42 ms");
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: "test-results/server-table.png" });
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

test("server table keeps headers when empty and prevents full-server joins", async ({ page }) => {
  await page.goto(story("components-worldlist--empty"));
  await expect(page.getByRole("columnheader", { name: "Name", exact: true })).toBeVisible();
  await expect(page.getByText("No servers available.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create a world" })).toHaveCount(0);
  await page.goto(story("components-worldlist--full"));
  await expect(page.getByRole("button", { name: /Join Playtest Default, full/ })).toBeDisabled();
  await expect(page.getByRole("table")).toContainText("32/32");
  await expect(page.getByRole("table")).toContainText("—");
});

test("server rows join once from every cell and keyboard, respecting disabled states", async ({
  page,
}) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(story("components-worldlist--row-interaction"));
    const row = page.getByRole("row").filter({ hasText: "Northern grove" });
    const status = page.getByRole("status");
    for (let cell = 0; cell < 3; cell++) {
      await row
        .getByRole("cell")
        .nth(cell)
        .click({ position: { x: 4, y: 4 } });
      await expect(status).toHaveText(`Joins: ${cell + 1}`);
    }
    const join = row.getByRole("button");
    await join.click();
    await expect(status).toHaveText("Joins: 4");
    await join.focus();
    await expect(join).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(status).toHaveText("Joins: 5");
    await page.keyboard.press("Space");
    await expect(status).toHaveText("Joins: 6");
    const full = page.getByRole("row").filter({ hasText: "Full world" });
    for (let cell = 0; cell < 3; cell++) {
      await full
        .getByRole("cell")
        .nth(cell)
        .click({ position: { x: 4, y: 4 } });
    }
    await expect(full.getByRole("button")).toBeDisabled();
    await expect(status).toHaveText("Joins: 6");
    await page.goto(story("components-worldlist--disabled"));
    for (let cell = 0; cell < 3; cell++) {
      await row
        .getByRole("cell")
        .nth(cell)
        .click({ position: { x: 4, y: 4 } });
    }
    await expect(row.getByRole("button")).toBeDisabled();
    await expect(status).toHaveText("Joins: 0");
  }
});
