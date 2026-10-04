import { test, expect } from "./fixtures";
import { LOBBY_PORTAL, starterEquipment } from "../packages/common-new/src/index.ts";

test("hitbox debugging defaults off, toggles live, persists and renders in training and wrapped forest", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  let player = [...world.players.values()][0];
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-debug-hitboxes", "0");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "Debug mode: show hitboxes" });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(canvas).toHaveAttribute("data-debug-hitboxes", /^[1-9]\d*$/);
  await page.getByRole("button", { name: "Close Settings" }).click();
  await page.screenshot({ path: "test-results/hitboxes-village.png" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await expect(canvas).toHaveAttribute("data-debug-hitboxes", /^[1-9]\d*$/);
  player = [...world.players.values()][0];
  for (const classId of ["warrior", "ranger", "mage", "druid"] as const) {
    player.classId = classId;
    player.equipment = starterEquipment(classId);
    const dummy = world.training!.enemies[0];
    player.x = dummy.x - 40;
    player.y = dummy.y;
    player.attackAt = undefined;
    for (const enemy of world.training!.enemies) enemy.hitpoints = enemy.maxHitpoints!;
    await expect.poll(() => world.training?.damage.length ?? 0).toBeGreaterThan(0);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `test-results/hitboxes-training-${classId}.png` });
    world.training!.damage = [];
  }
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
  player.x = 3;
  player.y = 100;
  await expect(canvas).toHaveAttribute("data-debug-hitboxes", /^[1-9]\d*$/);
  await page.waitForTimeout(350);
  await page.screenshot({ path: "test-results/hitboxes-forest-seam.png" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(canvas).toHaveAttribute("data-debug-hitboxes", "0");
  await page.getByRole("button", { name: "Close Settings" }).click();
  await page.setViewportSize({ width: 480, height: 800 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await toggle.check();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "test-results/hitboxes-settings-narrow.png" });
  expect(errors).toEqual([]);
});
