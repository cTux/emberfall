import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

test("local arrows and attracted loot follow prediction while low ping does not hide stale gameplay", async ({
  page,
}) => {
  const world: WorldState = {
    id: "fixture",
    name: "Prediction",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Predict",
        classId: "ranger",
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
        attackAt: 10000,
      },
    ],
    scene: {
      id: "s",
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: 120000,
      nextSpawn: 1e9,
      sequence: 10,
      damage: [],
      portals: [],
      enemies: [{ id: 1, x: 2700, y: 1280, hitpoints: 10, angle: 0 }],
      drops: [{ id: 2, kind: "gold", x: 2261, y: 1280, at: 9000, collectorId: "p" }],
      playerShots: [],
    },
  };
  await page.routeWebSocket("**/ws", (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "ping") socket.send(JSON.stringify({ type: "pong", id: message.id }));
      if (message.type === "create")
        socket.send(
          JSON.stringify({ type: "joined", world, playerId: "p", characterToken: "a".repeat(64) }),
        );
      // Keep ping responsive while withholding movement acknowledgements and snapshots.
    });
  });
  await page.addInitScript(() => {
    const capture = { arrows: [] as { at: number; x: number }[], loot: [] as number[] };
    (window as unknown as { predictionCapture: typeof capture }).predictionCapture = capture;
    const stroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke = new Proxy(stroke, {
      apply(target, context, args) {
        if (context.strokeStyle === "#92d89c")
          capture.arrows.push({ at: performance.now(), x: context.getTransform().e });
        return Reflect.apply(target, context, args);
      },
    });
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
      apply(target, context, args) {
        if (
          args.length === 3 &&
          args[0] instanceof HTMLCanvasElement &&
          args[0].width === 40 &&
          args[0].height === 40
        )
          capture.loot.push(
            context.getTransform().transformPoint({ x: args[1] + 20, y: args[2] }).x,
          );
        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.locator("canvas[aria-label^='Forest combat']")).toBeVisible();
  await page.keyboard.down("d");
  const started = await page.evaluate(() => performance.now());
  await page.waitForTimeout(850);
  await page.keyboard.up("d");
  const capture = await page.evaluate(() => {
    const data = (
      window as unknown as {
        predictionCapture: { arrows: { at: number; x: number }[]; loot: number[] };
      }
    ).predictionCapture;
    return { ...data, center: document.querySelector("canvas")!.width / 2 };
  });
  expect(
    capture.arrows.some((a) => a.at > started + 450 && Math.abs(a.x - capture.center) < 1),
  ).toBe(true);
  expect(capture.loot.length).toBeGreaterThan(5);
  expect(capture.loot.at(-1)! - capture.loot[0]).toBeGreaterThan(20);
  await expect
    .poll(async () =>
      Number(
        (
          await page.getByLabel("Input acknowledgement delay", { exact: true }).textContent()
        )?.match(/\d+/)?.[0],
      ),
    )
    .toBeGreaterThan(500);
  await expect
    .poll(async () =>
      Number(
        (await page.getByLabel("Snapshot age since receipt", { exact: true }).textContent())?.match(
          /\d+/,
        )?.[0],
      ),
    )
    .toBeGreaterThan(800);
  expect(
    Number(await page.locator('[data-series="latency"]').getAttribute("data-value")),
  ).toBeLessThan(100);
  await page.screenshot({ path: "test-results/predicted-effects.png" });
});

test("a one-pixel server correction is visually ignored without walking animation", async ({
  page,
}) => {
  let correct = false;
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((message) => server.send(message));
    server.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (correct && message.type === "state") message.world.players[0].x -= 1;
      client.send(JSON.stringify(message));
    });
  });
  await page.addInitScript(() => {
    const capture = { positions: [] as number[], rows: [] as number[] };
    (window as unknown as { correctionCapture: typeof capture }).correctionCapture = capture;
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y) {
      if (value === "Smooth" && this.font === '8px "Alegreya Sans", sans-serif')
        capture.positions.push(x);
      text.call(this, value, x, y);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLImageElement && args[0].src.endsWith("/knight.png"))
          capture.rows.push(args[2]);
        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Smooth");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const capture = (
      window as unknown as { correctionCapture: { positions: number[]; rows: number[] } }
    ).correctionCapture;
    capture.positions = [];
    capture.rows = [];
  });
  correct = true;
  await page.waitForTimeout(350);
  const capture = await page.evaluate(
    () =>
      (window as unknown as { correctionCapture: { positions: number[]; rows: number[] } })
        .correctionCapture,
  );
  expect(capture.positions.every((x) => Math.abs(x - 420) < 0.01)).toBe(true);
  expect(capture.positions.at(-1)).toBeCloseTo(420, 3);
  expect(
    Math.max(...capture.positions.slice(1).map((x, i) => Math.abs(x - capture.positions[i]))),
  ).toBeLessThan(0.6);
  expect([...new Set(capture.rows)]).toEqual([0]);
});

test("local movement is instant during delayed snapshots and reconciles after delivery resumes", async ({
  page,
}) => {
  let blocked = false,
    held: string | undefined,
    delivered = 0,
    latest: WorldState | undefined;
  let release: () => void = () => {};
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((message) => server.send(message));
    release = () => {
      if (held) {
        client.send(held);
        held = undefined;
      }
    };
    server.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "state") {
        latest = message.world;
        if (blocked) {
          held = String(raw);
          return;
        }
        delivered++;
      }
      client.send(raw);
    });
  });
  await page.addInitScript(() => {
    (window as unknown as { heroX: number }).heroX = 0;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text === "Buffered" && this.font === '8px "Alegreya Sans", sans-serif')
        (window as unknown as { heroX: number }).heroX = x;
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Buffered");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect.poll(() => latest?.players[0].inputSeq ?? 0).toBeGreaterThan(2);
  blocked = true;
  const received = delivered;
  const start = await page.evaluate(() => (window as unknown as { heroX: number }).heroX);
  await page.keyboard.down("d");
  await page.waitForTimeout(180);
  await page.keyboard.up("d");
  const predicted = await page.evaluate(() => (window as unknown as { heroX: number }).heroX);
  expect(predicted - start).toBeGreaterThan(18);
  expect(delivered).toBe(received);
  await expect(page.getByLabel("Snapshot age since receipt", { exact: true })).toBeVisible();
  blocked = false;
  release();
  await expect
    .poll(async () => {
      const rendered = await page.evaluate(() => (window as unknown as { heroX: number }).heroX);
      return Math.abs(rendered - latest!.players[0].x);
    })
    .toBeLessThanOrEqual(2.001); // Rendering deliberately retains up to two units of correction offset.
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
});
