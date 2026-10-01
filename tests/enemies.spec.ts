import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

test("elite and boss render yellow and orange proportional health bars and a boss objective", async ({
  page,
}) => {
  const world: WorldState = {
    id: "fixture",
    name: "Enemy render fixture",
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
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
        scene: "forest",
        attackAt: 10000,
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
      sequence: 2,
      bossId: 2,
      portals: [],
      damage: [],
      enemies: [
        { id: 1, kind: "elite", x: 2250, y: 1280, hitpoints: 25, angle: 0 },
        { id: 2, kind: "boss", x: 2550, y: 1280, hitpoints: 100, angle: 0 },
      ],
    },
  };
  world.players[0].hitpoints = 50;
  world.players.push({ ...world.players[0], id: "ally", name: "Far ally", x: 3500 });
  world.scene!.damage = (["skeleton", "runner", "brute", "caster"] as const).map(
    (archetype, i) => ({
      id: i + 20,
      target: `enemy:${i + 20}`,
      x: 2280 + i * 80,
      y: 1390,
      at: 9650,
      amount: 5,
      killed: true,
      enemy: { archetype, kind: "normal", angle: 0 },
    }),
  );
  let update = () => {};
  await page.routeWebSocket("**/ws", (socket) => {
    update = () => socket.send(JSON.stringify({ type: "state", world }));
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "create")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
    });
  });
  await page.addInitScript(() => {
    let puddles = 0;
    let edges = 0;
    const begin = CanvasRenderingContext2D.prototype.beginPath;
    CanvasRenderingContext2D.prototype.beginPath = function () {
      edges = 0;
      begin.call(this);
    };
    const line = CanvasRenderingContext2D.prototype.lineTo;
    CanvasRenderingContext2D.prototype.lineTo = function (x, y) {
      edges++;
      line.call(this, x, y);
    };
    const transform = CanvasRenderingContext2D.prototype.setTransform;
    CanvasRenderingContext2D.prototype.setTransform = new Proxy(transform, {
      apply(target, ctx, args) {
        if (ctx.canvas === document.querySelector("canvas")) {
          document.body.dataset.bloodPuddles = String(puddles);
          puddles = 0;
        }
        return Reflect.apply(target, ctx, args);
      },
    });
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = new Proxy(fill, {
      apply(target, ctx, args) {
        if (ctx.fillStyle === "#8c1728") {
          puddles++;
          document.body.dataset.bloodEdges = String(edges);
          document.body.dataset.bloodOpacity = String(ctx.globalAlpha);
        }
        return Reflect.apply(target, ctx, args);
      },
    });
    const bars: Record<string, number> = {};
    (window as unknown as { enemyBars: typeof bars }).enemyBars = bars;
    const images = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(images, {
      apply(target, ctx, args) {
        if (
          args[0] instanceof HTMLImageElement &&
          ctx.globalAlpha > 0.45 &&
          ctx.globalAlpha < 0.55 &&
          Math.abs(ctx.getTransform().b) > 0.1
        ) {
          const name = args[0].src.split("/").at(-1)!.replace(".png", "");
          document.body.setAttribute(`data-death-${name}`, "yes");
        }
        return Reflect.apply(target, ctx, args);
      },
    });
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y) {
      if (value === "The Hollow Warden" && this.font === "12px system-ui")
        document.body.dataset.bossName = value;
      if (this.font === "bold 11px system-ui" && value === "Far ally")
        document.body.dataset.allyArrow = "yes";
      if (this.font === "bold 11px system-ui" && value === "The Hollow Warden")
        document.body.dataset.bossArrow = "yes";
      text.call(this, value, x, y);
    };
    const original = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (height === 3 && ["#f4d447", "#ff9638"].includes(String(this.fillStyle)))
        bars[String(this.fillStyle)] = width;
      if (height === 2 && this.fillStyle === "#86d9a2")
        document.body.dataset.playerHealthWidth = String(width);
      original.call(this, x, y, width, height);
    };
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  const hud = page.getByLabel("Boss health", { exact: true });
  const health = page.getByRole("progressbar", { name: "The Hollow Warden hitpoints" });
  await expect(hud).toContainText("The Hollow Warden");
  await expect(health).toHaveAttribute("aria-valuenow", "100");
  await expect(health).toHaveAttribute("aria-valuemax", "200");
  await expect(health).toContainText("100 / 200 HP");
  const position = await hud.boundingBox();
  expect(position!.x + position!.width / 2).toBe(720);
  expect(position!.y).toBe(14);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { enemyBars: Record<string, number> }).enemyBars),
    )
    .toEqual({ "#f4d447": 16, "#ff9638": 16 });
  await expect(page.locator("body")).toHaveAttribute("data-boss-name", "The Hollow Warden");
  for (const archetype of ["skeleton", "runner", "brute", "caster"])
    await expect(page.locator("body")).toHaveAttribute(`data-death-${archetype}`, "yes");
  await expect(page.locator("body")).toHaveAttribute("data-blood-puddles", "4");
  await expect(page.locator("body")).toHaveAttribute("data-blood-opacity", "0.5");
  await expect(page.locator("body")).toHaveAttribute("data-blood-edges", "23");
  // Puddles survive expiry of the server's short-lived damage events.
  world.scene!.damage = [];
  world.serverNow = 12000;
  update();
  await expect(page.locator("body")).toHaveAttribute("data-blood-puddles", "4");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Blood puddles", { exact: true }).uncheck();
  await expect(page.locator("body")).toHaveAttribute("data-blood-puddles", "0");
  await page.getByLabel("Blood puddles", { exact: true }).check();
  await expect(page.locator("body")).toHaveAttribute("data-blood-puddles", "4");
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-player-health-width", "19");
  await expect(page.locator("body")).toHaveAttribute("data-ally-arrow", "yes");
  await page.screenshot({ path: "test-results/elite-boss-bars.png" });
  world.scene!.enemies[1].x = 4000;
  world.scene!.enemies[1].hitpoints = 50;
  update();
  await expect(health).toHaveAttribute("aria-valuenow", "50");
  await expect(health.locator("span")).toHaveAttribute("style", "width: 25%;");
  expect(await hud.boundingBox()).toEqual(position);
  await expect(page.locator("body")).toHaveAttribute("data-boss-arrow", "yes");
  world.players[0].scene = undefined;
  update();
  await expect(hud).toBeHidden();
  world.players[0].scene = "forest";
  world.scene!.phase = "ended";
  world.scene!.enemies = [];
  update();
  await expect(hud).toBeHidden();
  await expect(
    page.getByText("Scene complete · Return portal open", { exact: true }),
  ).toBeVisible();
  world.scene!.id = "next-run";
  update();
  await expect(page.locator("body")).toHaveAttribute("data-blood-puddles", "0");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Blood puddles", { exact: true }).uncheck();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Blood puddles", { exact: true })).not.toBeChecked();
});
