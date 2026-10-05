import { test, expect } from "./fixtures";
import type { WorldState } from "../packages/common/src/index";

test("boss HUD uses scaled health and updates on every snapshot", async ({ page }) => {
  const world: WorldState = {
    id: "fixture",
    name: "Boss health fixture",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Hunter",
        x: 2400,
        y: 1280,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
        scene: "forest",
      },
    ],
    scene: {
      id: "run",
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: 9500,
      nextSpawn: 20000,
      sequence: 1,
      bossId: 1,
      portals: [],
      damage: [],
      enemies: [
        {
          id: 1,
          kind: "boss",
          archetype: "brute",
          x: 2550,
          y: 1280,
          hitpoints: 300,
          maxHitpoints: 400,
          angle: 0,
        },
      ],
    },
  };
  let update = () => {};
  await page.routeWebSocket("**/ws", (socket) => {
    socket.send(
      JSON.stringify({
        type: "worlds",
        worlds: [{ id: "fixture", name: "Playtest Default", players: 0, capacity: 32 }],
      }),
    );
    update = () => socket.send(JSON.stringify({ type: "state", world }));
    socket.onMessage((raw) => {
      if (JSON.parse(String(raw)).type === "join")
        socket.send(
          JSON.stringify({
            type: "joined",
            playerId: "p",
            world,
            characterToken: "a".repeat(64),
          }),
        );
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  const hud = page.getByLabel("Boss health", { exact: true });
  const health = page.getByRole("progressbar", { name: "The Hollow Warden HP" });
  await expect(health).toHaveAttribute("aria-valuemax", "400");
  for (const hp of [300, 250, 100]) {
    world.scene!.enemies[0].hitpoints = hp;
    world.serverNow! += 50;
    update();
    await expect(health).toHaveAttribute("aria-valuenow", String(hp));
    await expect(hud).toContainText(`${hp} / 400`);
    await expect(health.locator(".MuiLinearProgress-bar")).toHaveAttribute(
      "style",
      `transform: translateX(-${100 - hp / 4}%);`,
    );
  }
  // Old snapshots without a stored maximum retain the base boss health.
  world.scene!.enemies[0].maxHitpoints = undefined;
  world.scene!.enemies[0].hitpoints = 150;
  update();
  await expect(health).toHaveAttribute("aria-valuemax", "200");
  await expect(hud).toContainText("150 / 200");
  world.scene!.phase = "ended";
  world.scene!.enemies = [];
  update();
  await expect(hud).toBeHidden();
});
