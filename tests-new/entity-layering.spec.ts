import { test, expect } from "./fixtures";
import { LOBBY_PORTAL } from "../packages/common-new/src/index.ts";

test("dummies, remote players and forest enemies layer around the local player", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Layer tester");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.attackAt = Date.now() + 600000;
  const dummy = world.training!.enemies[0];
  // Server-arranged poses cross the real Colyseus snapshot and render path.
  const capture = async (name: string, x: number, y: number) => {
    player.x = x;
    player.y = y;
    await page.waitForTimeout(700); // Let interpolation and render reconciliation settle.
    await page.screenshot({ path: `test-results/layering-${name}.png` });
    expect(player.hitpoints).toBe(player.maxHitpoints);
  };
  await capture("dummy-behind", dummy.x, dummy.y - 12);
  await capture("dummy-front", dummy.x, dummy.y + 12);
  await capture("dummy-clear", dummy.x + 70, dummy.y - 12);
  const remote = {
    ...player,
    id: "layer-remote",
    name: "Other player",
    x: dummy.x,
    y: dummy.y,
    attackAt: Date.now() + 600000,
  };
  world.players.set(remote.id, remote);
  dummy.x += 150;
  await capture("player-behind", remote.x, remote.y - 12);
  await capture("player-front", remote.x, remote.y + 12);
  world.players.delete(remote.id);
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
  const scene = world.scene!;
  scene.nextSpawn = Date.now() + 600000;
  scene.spawns = [];
  scene.projectiles = [];
  scene.playerShots = [];
  player.hitpoints = player.maxHitpoints;
  player.attackAt = Date.now() + 600000;
  scene.enemies = [
    {
      id: 999,
      x: player.x,
      y: player.y,
      angle: 0,
      archetype: "brute",
      hitpoints: 30,
      cooldownUntil: Date.now() + 600000,
      debuffs: [
        {
          kind: "roots",
          stacks: 1,
          expiresAt: Date.now() + 600000,
          nextTick: Date.now() + 600000,
          ownerId: player.id,
        },
      ],
    },
  ];
  const enemy = scene.enemies[0];
  await capture("enemy-behind", enemy.x, enemy.y - 12);
  await capture("enemy-front", enemy.x, enemy.y + 12);
  enemy.x = 4798;
  await capture("enemy-wrapped", 2, enemy.y - 12);
  expect(errors).toEqual([]);
});
