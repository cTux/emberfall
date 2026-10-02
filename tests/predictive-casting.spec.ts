import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";
import { requestPlayerCast, tickPlayerCombat } from "../packages/common/src/index";

test("moving mage draws fireballs at the player before any server cast arrives", async ({
  page,
}) => {
  const world: WorldState = {
    id: "prediction",
    name: "Prediction",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Mage",
        classId: "mage",
        x: 140,
        y: 340,
        attackAt: 9600,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
      },
    ],
    training: {
      id: "training",
      training: true,
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: null,
      portals: [],
      sequence: 0,
      nextSpawn: 20000,
      damage: [],
      playerShots: [],
      enemies: [{ id: 1, x: 300, y: 340, hitpoints: 100, angle: 0 }],
    },
  };
  await page.routeWebSocket("**/ws", (socket) => {
    socket.onMessage((raw) => {
      if (JSON.parse(String(raw)).type === "create")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
    });
  });
  await page.addInitScript(() => {
    const capture = { mageX: 0, slashes: 0, shots: [] as { x: number; mageX: number }[] };
    (window as unknown as { castingCapture: typeof capture }).castingCapture = capture;
    HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
      apply(target, audio: HTMLMediaElement, args) {
        if (audio.src.endsWith("/slash.wav")) capture.slashes++;
        return Reflect.apply(target, audio, args);
      },
    });
    const proto = CanvasRenderingContext2D.prototype;
    proto.fillText = new Proxy(proto.fillText, {
      apply(target, ctx: CanvasRenderingContext2D, args) {
        if (args[0] === "Mage")
          capture.mageX = ctx.getTransform().transformPoint({ x: args[1], y: args[2] }).x;
        return Reflect.apply(target, ctx, args);
      },
    });
    proto.arc = new Proxy(proto.arc, {
      apply(target, ctx: CanvasRenderingContext2D, args) {
        if (ctx.fillStyle === "#ff9d36" && args[2] === 8)
          capture.shots.push({
            x: ctx.getTransform().transformPoint({ x: args[0], y: args[1] }).x,
            mageX: capture.mageX,
          });
        return Reflect.apply(target, ctx, args);
      },
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await page.keyboard.down("d");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              castingCapture: { shots: unknown[] };
            }
          ).castingCapture.shots.length,
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.up("d");
  const first = await page.evaluate(
    () =>
      (
        window as unknown as {
          castingCapture: { shots: { x: number; mageX: number }[] };
        }
      ).castingCapture.shots[0],
  );
  expect(Math.abs(first.x - first.mageX)).toBeLessThan(0.5);
  // The fixture never sends a projectile: this must be a client-predicted launch.
  expect(world.training!.playerShots).toEqual([]);
  await page.screenshot({ path: "test-results/predictive-casting.png" });
  const slashCount = () =>
    page.evaluate(
      () => (window as unknown as { castingCapture: { slashes: number } }).castingCapture.slashes,
    );
  await expect.poll(slashCount).toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(await page.locator('[data-series="snapshotAge"]').getAttribute("data-value")),
    )
    .toBeGreaterThan(1200);
  const stopped = await slashCount();
  await page.waitForTimeout(800);
  expect(await slashCount()).toBe(stopped);
});

test("manual LMB casts confirm after latency without another slash or a held-input repeat", async ({
  page,
}) => {
  const world: WorldState = {
    id: "manual",
    name: "Manual",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Mage",
        classId: "mage",
        autoAttack: false,
        autoTarget: false,
        scene: "forest",
        x: 2400,
        y: 1280,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
      },
    ],
    scene: {
      id: "run",
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: 1e9,
      nextSpawn: 1e9,
      sequence: 0,
      portals: [],
      damage: [],
      enemies: [{ id: 1, x: 2600, y: 1280, hitpoints: 100, angle: 0 }],
    },
  };
  const requests: { id: number; aimX: number }[] = [];
  let confirmed = false;
  await page.routeWebSocket("**/ws", (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "create")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
      if (message.type === "cast") {
        requests.push(message);
        setTimeout(() => {
          const reply = structuredClone(world);
          reply.serverNow = 10400;
          requestPlayerCast(reply.scene, reply.players[0], message, 10400);
          tickPlayerCombat(reply.scene!, reply.players, 10400, 0);
          socket.send(JSON.stringify({ type: "state", world: reply }));
          confirmed = true;
        }, 300);
      }
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "emberfall.preferences",
      JSON.stringify({ autoAttack: false, autoTarget: false, music: false }),
    );
    const capture = { slashes: 0 };
    (window as unknown as { manualCapture: typeof capture }).manualCapture = capture;
    HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
      apply(target, audio: HTMLMediaElement, args) {
        if (audio.src.endsWith("/slash.wav")) capture.slashes++;
        return Reflect.apply(target, audio, args);
      },
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await page.mouse.move(850, 500);
  await page.mouse.down();
  await expect.poll(() => requests.length).toBe(1);
  await page.mouse.up();
  expect(requests[0].aimX).toBeGreaterThan(2400);
  await expect.poll(() => confirmed).toBe(true);
  await page.waitForTimeout(800);
  expect(requests.length).toBe(1);
  expect(
    await page.evaluate(
      () => (window as unknown as { manualCapture: { slashes: number } }).manualCapture.slashes,
    ),
  ).toBe(1);
});
