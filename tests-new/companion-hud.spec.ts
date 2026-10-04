import { test, expect } from "./fixtures";
import { starterEquipment, LOBBY_PORTAL } from "../packages/common-new/src/index.ts";

test("companion HUD follows confirmed health in village and forest and disappears with class change", async ({
  page,
  game,
}) => {
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Companion hero");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const card = page.getByRole("article", { name: "Companion hero", exact: true });
  const companion = card.getByRole("progressbar", { name: "Bear", exact: true });
  await expect(companion).toHaveCount(0);
  player.classId = "druid";
  player.equipment = starterEquipment("druid");
  await expect(companion).toBeVisible();
  await expect(card.getByRole("img", { name: "Bear portrait" })).toBeVisible();
  await expect.poll(() => player.bear?.maxHitpoints).toBeGreaterThan(0);
  player.bear!.hitpoints = 37;
  await expect(companion).toHaveAttribute("aria-valuenow", "37");
  await expect(companion).toHaveAttribute("aria-valuemax", String(player.bear!.maxHitpoints));
  await page.screenshot({ path: "test-results/companion-hud-village.png" });
  player.bear!.hitpoints = 0;
  player.bear!.resurrectAt = Date.now() + 60000;
  await expect(companion).toHaveAttribute("aria-valuenow", "0");
  player.bear!.hitpoints = player.bear!.maxHitpoints;
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
  await expect(companion).toBeVisible();
  await page.screenshot({ path: "test-results/companion-hud-forest.png" });
  player.classId = "warrior";
  player.equipment = starterEquipment("warrior");
  await expect(companion).toHaveCount(0);
});
