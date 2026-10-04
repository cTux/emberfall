import { test, expect } from "./fixtures";
import type { ServerMessage, WorldState } from "../packages/common/src/index.ts";

test("failed connections retry automatically and interrupted lobby, vote and forest sessions resume", async ({
  page,
}) => {
  test.setTimeout(45000);
  let attempts = 0;
  let joined: Extract<ServerMessage, { type: "joined" }> | undefined;
  let state: WorldState | undefined;
  const errors: string[] = [];
  let unavailable = false;
  let failedAttempts = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    let attempts = 0;
    window.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(
          ++attempts <= 2 || (window as unknown as { unavailable?: boolean }).unavailable
            ? new URL("/unavailable", url)
            : url,
          protocols,
        );
        (window as unknown as { recoverySocket: WebSocket }).recoverySocket = this;
      }
    };
  });
  page.on("websocket", (socket) => {
    attempts++;
    if (unavailable) failedAttempts++;
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload)) as ServerMessage;
      if (message.type === "joined") joined = message;
      if (message.type === "state" || message.type === "joined") state = message.world;
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "World server online", includeHidden: true }),
  ).toBeVisible();
  expect(attempts).toBe(3);
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("complementary", { name: /Playtest Default/ })).toBeVisible();
  const id = joined!.playerId;
  const worldId = joined!.world.id;
  const interrupt = async () => {
    const before = attempts;
    joined = undefined;
    unavailable = true;
    failedAttempts = 0;
    await page.evaluate(() => {
      (window as unknown as { unavailable: boolean }).unavailable = true;
    });
    await page.evaluate(() =>
      (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(
        3001,
        "Simulated transport failure",
      ),
    );
    await expect(page.getByRole("region", { name: "Emberfall", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Join a world" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("complementary", { name: /Playtest Default/ })).toBeHidden();
    await expect.poll(() => failedAttempts).toBeGreaterThanOrEqual(2);
    unavailable = false;
    await page.evaluate(() => {
      (window as unknown as { unavailable: boolean }).unavailable = false;
    });
    await expect.poll(() => attempts).toBeGreaterThan(before + 1);
    await expect.poll(() => joined?.playerId).toBe(id);
    expect(joined!.world.id).toBe(worldId);
    expect(joined!.world.players).toHaveLength(1);
    await expect(
      page.getByRole("status", { name: "World server online", includeHidden: true }),
    ).toBeVisible();
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
  // The permanent world survives a normal closure; recovery starts in its village.
  joined = undefined;
  await page.evaluate(() =>
    (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(1000),
  );
  await expect(
    page.getByRole("status", { name: "World server online", includeHidden: true }),
  ).toBeVisible();
  await expect.poll(() => joined?.world.id).toBe(worldId);
  await expect(page.getByLabel("Shared village. Move with WASD or arrow keys.")).toBeVisible();
  expect(joined!.world.players[0].scene).toBeUndefined();
  expect(errors).toEqual([]);
});

test("page reload resumes the same world and deliberate leave clears its recovery target", async ({
  page,
}) => {
  const network = await page.context().newCDPSession(page);
  await network.send("Network.enable");
  const vendorRequests = new Set<string>();
  const vendorBytes: number[] = [];
  network.on("Network.requestWillBeSent", ({ requestId, request }) => {
    if (/\/vendors-[\w-]+\.js$/.test(request.url)) vendorRequests.add(requestId);
  });
  network.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
    if (vendorRequests.has(requestId)) vendorBytes.push(encodedDataLength);
  });
  let joined: Extract<ServerMessage, { type: "joined" }> | undefined;
  page.on("websocket", (socket) =>
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload)) as ServerMessage;
      if (message.type === "joined") joined = message;
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("complementary", { name: /Playtest Default/ })).toBeVisible();
  const before = joined!;
  joined = undefined;
  await page.reload();
  await expect.poll(() => joined?.world.id).toBe(before.world.id);
  expect(joined!.playerId).toBe(before.playerId);
  expect(joined!.characterToken).toBe(before.characterToken);
  expect(joined!.world.players).toHaveLength(1);
  expect(vendorBytes).toHaveLength(2);
  expect(vendorBytes[0]).toBeGreaterThan(0);
  expect(vendorBytes[1]).toBe(0);
  await expect(page.getByRole("complementary", { name: /Playtest Default/ })).toBeVisible();
  await page.evaluate(() => {
    // Use the public protocol to exercise explicit leave independently of the exit dialog.
    const ws = (window as unknown as { recoverySocket: WebSocket }).recoverySocket;
    ws.send(JSON.stringify({ type: "leave" }));
  });
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("emberfall.world")))
    .toBeNull();
  await page.reload();
  await expect(page.getByLabel("Your adventurer name")).toBeVisible();
});

test("a new deployment reloads once, fetches its app bundle, and resumes the remembered world", async ({
  page,
  request,
}) => {
  const html = await (await request.get("/")).text();
  const entry = html.match(/\/assets\/index-[\w-]+\.js/)![0];
  const app = await (await request.get(entry)).text();
  const { buildId } = await (await request.get("/version.json")).json();
  const nextBuildId = "next-test-build";
  const nextEntry = "/assets/index-updated01.js";
  // Fulfilled HTML has no network address; allow its connection to the real loopback server.
  await page.context().grantPermissions(["local-network-access"]);
  let deployed = false;
  let navigations = 0;
  let appDownloads = 0;
  let updateChecks = 0;
  let joined: Extract<ServerMessage, { type: "joined" }> | undefined;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations++;
  });
  page.on("websocket", (socket) =>
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload)) as ServerMessage;
      if (message.type === "joined") joined = message;
    }),
  );
  await page.route("**/version.json", (route) => {
    if (deployed && ++updateChecks === 1) return route.fulfill({ status: 503 });
    if (deployed && updateChecks === 2) return route.fulfill({ json: { buildId: null } });
    return route.fulfill({ json: { buildId: deployed ? nextBuildId : buildId } });
  });
  await page.route("**/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: deployed ? html.replaceAll(entry, nextEntry) : html,
    }),
  );
  await page.route(`**${nextEntry}`, (route) => {
    appDownloads++;
    return route.fulfill({
      contentType: "text/javascript",
      body: app.replaceAll(buildId, nextBuildId),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("complementary", { name: /Playtest Default/ })).toBeVisible();
  const before = joined!;
  joined = undefined;
  deployed = true;
  await page.evaluate(() =>
    (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(3001),
  );
  await expect.poll(() => navigations).toBe(2);
  await expect.poll(() => joined?.world.id).toBe(before.world.id);
  await expect(page.getByRole("complementary", { name: /Playtest Default/ })).toBeVisible();
  expect(appDownloads).toBe(1);
  expect(updateChecks).toBeGreaterThanOrEqual(3);
  expect(joined!.characterToken).toBe(before.characterToken);
  expect(joined!.world.players).toHaveLength(1);
  expect(navigations).toBe(2);
  const vendor = html.match(/\/assets\/vendors-[\w-]+\.js/)![0];
  expect(await page.locator(`link[href="${vendor}"]`).count()).toBe(1);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        (window as unknown as { recoverySocket: WebSocket }).recoverySocket = this;
      }
    };
  });
});
