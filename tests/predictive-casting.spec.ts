import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

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
    const capture = { mageX: 0, shots: [] as { x: number; mageX: number }[] };
    (window as unknown as { castingCapture: typeof capture }).castingCapture = capture;
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
});
