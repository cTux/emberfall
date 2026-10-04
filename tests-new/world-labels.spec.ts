import { test, expect } from "./fixtures";
import { ARENA, LOBBY_PORTAL } from "../packages/common-new/src/index.ts";

test("React labels follow chat, wrapped camera, resolution and scene changes without blocking input", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Text tester");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  const chat = page.locator('.world-labels > [data-kind="chat"]');
  const message = "Привіт! Meet at the portal — a_long_message_that_wraps_without_overflow.";
  await page.getByRole("complementary", { name: "World chat", exact: true }).hover();
  await page.getByLabel("Chat message", { exact: true }).fill(message);
  await page.keyboard.press("Enter");
  await expect(chat).toHaveText(message);
  await page.getByLabel("Chat message", { exact: true }).blur();
  for (const x of [ARENA.width - 8, 8]) {
    player.x = x;
    await expect
      .poll(async () => {
        const box = await chat.boundingBox();
        return box ? Math.abs(box.x + box.width / 2 - 720) : 1000;
      })
      .toBeLessThan(2);
  }
  await expect(chat).toHaveCSS("pointer-events", "none");
  expect(
    await chat.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.tagName;
    }),
  ).toBe("CANVAS");
  player.x = LOBBY_PORTAL.x;
  player.y = LOBBY_PORTAL.y - 15;
  const badge = page
    .locator('.world-labels > [data-kind="badge"]')
    .filter({ hasText: "Forest portal" });
  await expect(badge).toHaveText("(E) Forest portal");
  await page.screenshot({ path: "test-results/new-text-village.png" });
  const desktopHeight = (await chat.boundingBox())!.height;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(async () => {
      const box = (await chat.boundingBox())!;
      return Math.abs(box.x + box.width / 2 - 195);
    })
    .toBeLessThan(2);
  expect((await chat.boundingBox())!.height).toBe(desktopHeight);
  expect(await chat.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/new-text-narrow.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const portal = page.getByRole("dialog", { name: "Forest portal" });
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(portal).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await portal.getByRole("button", { name: "Create", exact: true }).click();
  await portal.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByLabel("Forest combat scene.")).toBeVisible({ timeout: 10000 });
  await expect(badge).toHaveCount(0);
  await page.getByRole("complementary", { name: "World chat", exact: true }).hover();
  await page.getByLabel("Chat message", { exact: true }).fill("Forest chat");
  await page.keyboard.press("Enter");
  await expect(chat).toHaveText("Forest chat");
  await page.getByLabel("Chat message", { exact: true }).blur();
  const nativeHeight = (await chat.boundingBox())!.height;
  for (const option of ["75% · Performance", "150% · Supersampling"]) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Graphics", exact: true }).click();
    await page.getByRole("combobox", { name: "Render resolution" }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
    await page.getByRole("button", { name: "Close Settings", exact: true }).click();
    expect((await chat.boundingBox())!.height).toBe(nativeHeight);
  }
  const scene = world.scene!;
  scene.enemies = [
    ...scene.enemies,
    {
      id: ++scene.sequence,
      x: (player.x + 1200) % ARENA.width,
      y: player.y,
      angle: 0,
      kind: "boss",
      name: "Offscreen boss",
      hitpoints: 10000,
      maxHitpoints: 10000,
    },
  ];
  const navigation = page.locator('.world-labels > [data-kind="navigation"]');
  await expect(navigation).toContainText("Offscreen boss");
  await page.screenshot({ path: "test-results/new-text-forest.png" });
  await expect(chat).toHaveCount(0, { timeout: 15000 });
  expect(errors).toEqual([]);
});
