import { test, expect } from "./fixtures";
import {
  WARDROBE,
  TRAINING_ZONES,
  LOBBY_PORTAL,
  CLASS_IDS,
  CLASS_LABELS,
  forestDistance,
  starterEquipment,
} from "../packages/common-new/src/index.ts";

test("every wardrobe class trains through Colyseus, preserves health, and resumes after a transport loss", async ({
  page,
  game,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        (window as unknown as { testSocket: WebSocket }).testSocket = this;
        const state = window as unknown as { testGeneration?: number };
        state.testGeneration = (state.testGeneration ?? 0) + 1;
      }
    };
  });
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Class tester");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const wardrobe = page.getByRole("dialog", { name: "Wardrobe" });
  for (const classId of CLASS_IDS) {
    player.x = WARDROBE.x;
    player.y = WARDROBE.y - 15;
    await expect(async () => {
      await page.keyboard.press("e");
      await expect(wardrobe).toBeVisible();
    }).toPass({ intervals: [200], timeout: 6000 });
    const choice = wardrobe.getByRole("button", { name: new RegExp(`^${CLASS_LABELS[classId]}`) });
    if ((player.classId ?? "warrior") !== classId) await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => player.classId ?? "warrior").toBe(classId);
    await wardrobe.getByRole("button", { name: "Close Wardrobe", exact: true }).click();
    await expect(wardrobe).toBeHidden();
    if (classId === "druid") {
      player.x = 480;
      player.y = 360;
      await expect.poll(() => forestDistance(player.bear!, player)).toBeLessThan(21);
      // Isolate companion hits from the Druid's root projectiles.
      player.attackAt = Date.now() + 60000;
    }
    world.training!.damage = [];
    world.training!.playerShots = [];
    for (const enemy of world.training!.enemies) enemy.debuffs = [];
    const previousHit = world.training!.sequence;
    player.x = TRAINING_ZONES[0].x - 65;
    player.y = TRAINING_ZONES[0].y;
    // Damage records live for 800ms; 1s polling can miss every 1s companion hit.
    await expect
      .poll(() => world.training!.damage.some((hit) => hit.id > previousHit), {
        intervals: [50],
        timeout: 10000,
      })
      .toBe(true);
    await expect.poll(() => player.dps ?? 0).toBeGreaterThan(0);
    expect(player.hitpoints).toBe(player.maxHitpoints);
    expect(player.experience).toBe(0);
    if (classId === "druid") {
      await expect.poll(() => player.bear?.name).toBe("Bear");
      await expect
        .poll(() => world.training!.damage.some((hit) => hit.amount === 2), { intervals: [50] })
        .toBe(true);
      await expect
        .poll(() => forestDistance(player.bear!, world.training!.enemies[0]))
        .toBeLessThan(95);
    }
    await page.screenshot({ path: `test-results/new-training-${classId}.png` });
  }
  await page.getByRole("complementary", { name: "World chat", exact: true }).hover();
  await page.getByLabel("Chat message", { exact: true }).fill("Same party, new runtime");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("log")).toContainText("Same party, new runtime");
  const id = player.id,
    worldId = world.id;
  const generation = await page.evaluate(
    () => (window as unknown as { testGeneration: number }).testGeneration,
  );
  await page.evaluate(() =>
    (window as unknown as { testSocket: WebSocket }).testSocket.close(4001),
  );
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { testGeneration: number }).testGeneration),
    )
    .toBeGreaterThan(generation);
  await expect(
    page.getByRole("status", { name: "World server online", includeHidden: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect.poll(() => game.runtime.worlds.get(worldId)?.players.size).toBe(1);
  expect(game.runtime.worlds.get(worldId)!.players.get(id)?.classId).toBe("druid");
  await expect(page.locator(".party article .portrait")).toHaveCSS(
    "background-image",
    /druid-portrait.png/,
  );
  expect(errors).toEqual([]);
});

test("bear chases and defeats a forest boss after portal entry, opening the return portal", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.classId = "druid";
  player.equipment = starterEquipment("druid");
  player.attackAt = Date.now() + 60000;
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
  expect(world.scene?.phase).toBe("active");
  await page.screenshot({ path: "test-results/new-forest-combat.png" });
  const scene = world.scene!;
  player.attackAt = Date.now() + 60000;
  scene.playerShots = [];
  const id = ++scene.sequence;
  scene.bossId = id;
  scene.enemies = [
    {
      id,
      x: player.x + 40,
      y: player.y,
      angle: 0,
      archetype: "brute",
      kind: "boss",
      name: "The Hollow Warden",
      hitpoints: 2,
      maxHitpoints: 200,
    },
  ];
  await expect.poll(() => scene.phase).toBe("ended");
  await expect(page.getByText("Scene complete · Return portal open")).toBeVisible();
  expect(scene.portals.length).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/new-forest-return.png" });
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(page.getByLabel("Shared village. Move with WASD or arrow keys.")).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  expect(player.scene).toBeUndefined();
  expect(player.hitpoints).toBe(player.maxHitpoints);
  expect(errors).toEqual([]);
});

test("druid roots visibly bounce through authoritative training with one refreshed stack", async ({
  page,
  game,
}) => {
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Root tester");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = WARDROBE.x;
  player.y = WARDROBE.y - 15;
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(page.getByRole("dialog", { name: "Wardrobe" })).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await page
    .getByRole("dialog", { name: "Wardrobe" })
    .getByRole("button", { name: /^Druid/ })
    .click();
  await page.getByRole("button", { name: "Close Wardrobe", exact: true }).click();
  await expect.poll(() => player.classId).toBe("druid");
  const zone = TRAINING_ZONES[1];
  player.x = zone.x - 120;
  player.y = zone.y;
  if (player.bear) {
    player.bear.hitpoints = 0;
    player.bear.resurrectAt = Date.now() + 60000;
  }
  await expect
    .poll(
      () =>
        world.training!.playerShots!.some(
          (shot) => shot.kind === "roots" && shot.hitIds.length === 1,
        ),
      { intervals: [20] },
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        world.training!.enemies.filter((enemy) => enemy.debuffs?.some((d) => d.kind === "roots"))
          .length,
      { intervals: [50] },
    )
    .toBeGreaterThanOrEqual(2);
  for (const enemy of world.training!.enemies)
    for (const debuff of enemy.debuffs ?? []) {
      if (debuff.kind !== "roots") continue;
      expect(debuff.stacks).toBe(1);
      expect(debuff.expiresAt - Date.now()).toBeGreaterThan(3500);
      expect(debuff.expiresAt - Date.now()).toBeLessThanOrEqual(5000);
    }
  expect(player.experience).toBe(0);
  expect(world.training!.drops?.length ?? 0).toBe(0);
  await page.screenshot({ path: "test-results/druid-bounce-training.png" });
});
