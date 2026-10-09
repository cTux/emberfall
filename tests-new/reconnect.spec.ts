import { test, expect } from "./fixtures";

test("an outage shows the server list and automatically restores the same player", async ({
  page,
  game,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        (window as unknown as { recoverySocket: WebSocket }).recoverySocket = this;
      }
    };
  });
  let unavailable = false;
  let failedAttempts = 0;
  await page.route("**/matchmake/**", (route) => {
    if (unavailable) {
      failedAttempts++;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const target = await page.evaluate(() => sessionStorage.getItem("emberfall-new.world"));
  const browser = page.getByRole("region", { name: "Emberfall", exact: true });
  // Recovery must replace the hidden browser and dismiss a gameplay modal.
  await page.getByRole("button", { name: "Leave world" }).click();
  await expect(page.getByRole("dialog", { name: "Leave?", exact: true })).toBeVisible();
  unavailable = true;
  await page.evaluate(() =>
    (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(3001),
  );
  await expect(browser).toBeVisible();
  await expect(page.getByRole("tab", { name: "Join a world" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("dialog", { name: "Leave?", exact: true })).toBeHidden();
  await expect(page.locator(".party")).toBeHidden();
  await expect.poll(() => failedAttempts).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => sessionStorage.getItem("emberfall-new.world"))).toBe(target);
  await page.screenshot({ path: info.outputPath("disconnected-server-list.png") });
  unavailable = false;
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await expect(browser).toBeHidden();
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
  expect(world.players.size).toBe(1);
  expect([...world.players.values()][0]).toBe(player);
  await page.screenshot({ path: info.outputPath("reconnected-player.png") });
  // Deliberate leave still revokes recovery, even after an outage.
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(browser).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("emberfall-new.world"))).toBeNull();
  await page.reload();
  await expect(browser).toBeVisible();
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
  await expect(page.locator(".party")).toBeHidden();
  expect(errors).toEqual([]);
});

test("peers see a red reconnecting character in village and forest until recovery", async ({
  page,
  browser,
  game,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        (window as unknown as { recoverySocket: WebSocket }).recoverySocket = this;
      }
    };
  });
  const guest = await context.newPage();
  let unavailable = false;
  await guest.route("**/matchmake/**", (route) => (unavailable ? route.abort() : route.continue()));
  try {
    await guest.goto(page.url());
    await guest.getByRole("button", { name: /^Join Playtest Default/ }).click();
    await expect(guest.getByRole("button", { name: "Leave world" })).toBeVisible();
    const world = [...game.runtime.worlds.values()].find((w) => w.players.size === 2)!;
    const [host, remote] = [...world.players.values()];
    remote.x = host.x + 70;
    remote.y = host.y;
    for (const area of ["village", "forest"] as const) {
      if (area === "forest") {
        const { sceneAction, tickScene } = await import("../packages/server-new/src/scenes.ts");
        const { LOBBY_PORTAL } = await import("../packages/common-new/src/index.ts");
        for (const p of world.players.values()) {
          p.x = LOBBY_PORTAL.x;
          p.y = LOBBY_PORTAL.y - 15;
        }
        const now = Date.now();
        sceneAction(world, host, { type: "createScene", scene: "Forest", difficulty: "Easy" }, now);
        for (const p of world.players.values())
          sceneAction(world, p, { type: "ready", ready: true }, now);
        tickScene(world, now + 5000, 0);
        world.scene!.nextSpawn = 1e12;
        remote.x = host.x + 70;
        remote.y = host.y;
        await expect(page.getByLabel("Forest combat scene.")).toBeVisible();
      }
      unavailable = true;
      await guest.evaluate(() =>
        (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(3001),
      );
      await expect.poll(() => remote.reconnecting).toBe(true);
      expect(world.players.size).toBe(2);
      await page.waitForTimeout(500);
      await page.screenshot({ path: info.outputPath(`reconnecting-${area}.png`) });
      unavailable = false;
      await expect(guest.getByRole("button", { name: "Leave world" })).toBeVisible();
      await expect.poll(() => remote.reconnecting).toBeUndefined();
      expect(world.players.get(remote.id)).toBe(remote);
      await page.waitForTimeout(300);
      await page.screenshot({ path: info.outputPath(`restored-${area}.png`) });
    }
  } finally {
    await context.close();
  }
});
