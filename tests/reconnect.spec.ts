import { test, expect } from "@playwright/test";
import type { ServerMessage, WorldState } from "../packages/common/src/index.ts";

test("failed connections retry automatically and interrupted lobby, vote and forest sessions resume", async ({
  page,
}) => {
  test.setTimeout(45000);
  let attempts = 0;
  let joined: Extract<ServerMessage, { type: "joined" }> | undefined;
  let state: WorldState | undefined;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    let attempts = 0;
    window.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(++attempts <= 2 ? new URL("/unavailable", url) : url, protocols);
        (window as unknown as { recoverySocket: WebSocket }).recoverySocket = this;
      }
    };
  });
  page.on("websocket", (socket) => {
    attempts++;
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload)) as ServerMessage;
      if (message.type === "joined") joined = message;
      if (message.type === "state" || message.type === "joined") state = message.world;
    });
  });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
  expect(attempts).toBe(3);
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByLabel("World name", { exact: true }).fill("Recovery grove");
  await page.getByLabel("Password optional").fill("secret");
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("complementary", { name: /Recovery grove/ })).toBeVisible();
  const id = joined!.playerId;
  const worldId = joined!.world.id;
  const interrupt = async () => {
    const before = attempts;
    joined = undefined;
    await page.evaluate(() =>
      (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(
        3001,
        "Simulated transport failure",
      ),
    );
    await expect.poll(() => attempts).toBe(before + 1);
    await expect.poll(() => joined?.playerId).toBe(id);
    expect(joined!.world.id).toBe(worldId);
    expect(joined!.world.players).toHaveLength(1);
    await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
    await expect(page.getByRole("alert")).toBeHidden();
  };
  await interrupt();
  expect(joined!.world.players[0].scene).toBeUndefined();
  await page.keyboard.down("d");
  await expect.poll(() => state?.players[0].x).toBeGreaterThan(500);
  await page.keyboard.up("d");
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Forest portal" })).toContainText("Vote here");
  const sceneId = state!.scene!.id;
  const x = state!.players[0].x;
  await interrupt();
  expect(joined!.world.scene!.id).toBe(sceneId);
  expect(joined!.world.scene!.phase).toBe("voting");
  expect(Math.abs(joined!.world.players[0].x - x)).toBeLessThan(10);
  await expect(page.getByRole("dialog", { name: "Forest portal" })).toBeVisible();
  await page.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByLabel("Forest combat scene.")).toBeVisible({ timeout: 8000 });
  await interrupt();
  expect(joined!.world.scene!.id).toBe(sceneId);
  expect(joined!.world.players[0].scene).toBe("forest");
  await expect(page.getByLabel("Forest combat scene.")).toBeVisible();
  // A fresh movement stream must be accepted after restoration.
  const forestX = state!.players[0].x;
  await page.keyboard.down("d");
  await expect.poll(() => state!.players[0].x).toBeGreaterThan(forestX + 10);
  await page.keyboard.up("d");
  // A normal server closure removes the session, like an unavailable world after restart.
  await page.evaluate(() =>
    (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(1000),
  );
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("previous session is no longer available");
  await expect(page.getByLabel("Your adventurer name")).toBeVisible();
  expect(errors).toEqual([]);
});
