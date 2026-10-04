import { test, expect } from "./fixtures";
import { LOBBY_PORTAL } from "../packages/common-new/src/index.ts";

test.use({ graphicsPreset: "High" });

test("sunlight shafts render in village and forest with live presets and narrow views", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.screenshot({ path: "test-results/shafts-village-high.png" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  const shafts = page.getByLabel("Sunlight shafts (2D)", { exact: true });
  for (const preset of ["Low", "Balanced", "High"]) {
    await page.getByRole("button", { name: preset, exact: true }).click();
    await expect(shafts).toBeChecked({ checked: preset === "High" });
  }
  await shafts.uncheck();
  await page.getByRole("button", { name: "Close Settings", exact: true }).click();
  await page.screenshot({ path: "test-results/shafts-village-off.png" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await shafts.check();
  await page.getByRole("button", { name: "Close Settings", exact: true }).click();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = LOBBY_PORTAL.x;
  player.y = LOBBY_PORTAL.y - 15;
  await page.waitForTimeout(1000);
  const portal = page.getByRole("dialog", { name: "Forest portal" });
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(portal).toBeVisible({ timeout: 500 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await portal.getByRole("button", { name: "Create", exact: true }).click();
  await portal.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByLabel("Forest combat scene.")).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: "test-results/shafts-forest-high.png" });
  player.x = 4790;
  player.y = 2550;
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/shafts-forest-seam.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/shafts-forest-narrow.png" });
  expect(errors).toEqual([]);
});
