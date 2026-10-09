import { test, expect } from "./fixtures";
import { LOBBY_PORTAL } from "../packages/common-new/src/index.ts";

test("collected coins update the party HUD and survive leaving and rejoining", async ({
  page,
  game,
}, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Coin hero");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  const card = page.getByRole("article", { name: "Coin hero", exact: true });
  await expect(card.getByLabel("Coin hero: 0 coins", { exact: true })).toHaveText("0");
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = LOBBY_PORTAL.x;
  player.y = LOBBY_PORTAL.y - 15;
  const portal = page.getByRole("dialog", { name: "Forest portal" });
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(portal).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await portal.getByRole("button", { name: "Create", exact: true }).click();
  await portal.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByLabel("Forest combat scene.")).toBeVisible({ timeout: 10000 });
  player.coins = 999;
  world.scene!.drops = [
    { id: ++world.scene!.sequence, kind: "gold", x: player.x, y: player.y, at: Date.now() - 300 },
  ];
  await expect(card.getByLabel("Coin hero: 1000 coins", { exact: true })).toHaveText("1k");
  expect(player.coins).toBe(1000);
  expect(world.scene!.drops).toHaveLength(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`coins-forest-${width}.png`) });
  }
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByLabel("Shared village. Move with WASD or arrow keys.")).toBeVisible();
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(card.getByLabel("Coin hero: 1000 coins", { exact: true })).toHaveText("1k");
  await page.screenshot({ path: testInfo.outputPath("coins-restored-village.png") });
});
