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
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByLabel("Password (optional)").fill("secret");
  await page.getByRole("button", { name: "Light the ember" }).click();
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
