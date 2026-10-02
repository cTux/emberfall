import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

test("health bars touch names, debuffs align left, and boss bars are larger and purple", async ({
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
        {
          id: 2,
          kind: "boss",
          x: 2550,
          y: 1280,
          hitpoints: 100,
          angle: 0,
          debuffs: [
            { kind: "poison", stacks: 2, expiresAt: 100000, nextTick: 20000, ownerId: "p" },
            { kind: "burn", stacks: 1, expiresAt: 100000, nextTick: 20000, ownerId: "p" },
          ],
        },
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
    let bar = { x: 0, y: 0, width: 0, height: 0 };
    let bossBar = bar;
    (window as unknown as { enemyBars: typeof bars }).enemyBars = bars;
    const images = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(images, {
      apply(target, ctx, args) {
        if (args[0] instanceof HTMLImageElement && args[0].src.includes("/status/")) {
          const expectedX = bossBar.x + (args[0].src.includes("poison") ? 0 : 14);
          document.body.dataset.debuffAligned = String(
            args[1] === expectedX && args[2] + 12 === bossBar.y,
          );
        }
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
      if (value === "The Hollow Warden" && this.font === '8px "Alegreya Sans", sans-serif') {
        document.body.dataset.bossName = value;
        document.body.dataset.bossNameTouching = String(
          y - this.measureText(value).actualBoundingBoxAscent === bar.y + bar.height,
        );
      }
      if (value === "Hunter" && this.font === '8px "Alegreya Sans", sans-serif')
        document.body.dataset.playerNameTouching = String(
          y - this.measureText(value).actualBoundingBoxAscent === bar.y + bar.height,
        );
      if (this.font === 'bold 11px "Alegreya Sans", sans-serif' && value === "Far ally")
        document.body.dataset.allyArrow = "yes";
      if (this.font === 'bold 11px "Alegreya Sans", sans-serif' && value === "The Hollow Warden")
        document.body.dataset.bossArrow = "yes";
      text.call(this, value, x, y);
    };
    const original = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.fillStyle === "#101817") bar = { x, y, width, height };
      if (height === 3 && this.fillStyle === "#f4d447") bars[String(this.fillStyle)] = width;
      if (height === 7 && this.fillStyle === "#c084fc") {
        bars[String(this.fillStyle)] = width;
        bossBar = bar;
        document.body.dataset.bossBarLarger = String(bar.width > 40 && bar.height > 7);
      }
      if (height === 5 && this.fillStyle === "#86d9a2")
        document.body.dataset.playerHealthWidth = String(width);
      original.call(this, x, y, width, height);
    };
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  const hud = page.getByLabel("Boss health", { exact: true });
  const health = page.getByRole("progressbar", { name: "The Hollow Warden HP" });
  await expect(hud).toContainText("The Hollow Warden");
  await expect(health).toHaveAttribute("aria-valuenow", "100");
  await expect(health).toHaveAttribute("aria-valuemax", "200");
  await expect(hud).toContainText("100 / 200");
  const position = await hud.boundingBox();
  expect(position!.x + position!.width / 2).toBe(720);
  expect(position!.y).toBe(14);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { enemyBars: Record<string, number> }).enemyBars),
    )
    .toMatchObject({ "#f4d447": 16 });
  expect(
    (
      await page.evaluate(
        () => (window as unknown as { enemyBars: Record<string, number> }).enemyBars,
      )
    )["#c084fc"],
  ).toBeGreaterThan(16);
  await expect(page.locator("body")).toHaveAttribute("data-boss-name", "The Hollow Warden");
  for (const attribute of [
    "boss-name-touching",
    "player-name-touching",
    "boss-bar-larger",
    "debuff-aligned",
  ])
    await expect(page.locator("body")).toHaveAttribute(`data-${attribute}`, "true");
  await expect(health.locator(".MuiLinearProgress-bar")).toHaveCSS(
    "background-color",
    "rgb(189, 148, 232)",
  );
  for (const archetype of ["skeleton", "runner", "brute", "caster"])
    await expect(page.locator("body")).toHaveAttribute(`data-death-${archetype}`, "yes");
  await expect(page.locator("body")).toHaveAttribute("data-blood-puddles", "4");
  expect(Number(await page.locator("body").getAttribute("data-blood-opacity"))).toBeCloseTo(0.5, 1);
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
  await page.getByRole("button", { name: /^Close / }).click();
  await expect(page.locator("body")).toHaveAttribute("data-player-health-width", "19");
  await expect(page.locator("body")).toHaveAttribute("data-ally-arrow", "yes");
  await page.screenshot({ path: "test-results/elite-boss-bars.png" });
  world.scene!.enemies[1].x = 4000;
  world.scene!.enemies[1].hitpoints = 50;
  update();
  await expect(health).toHaveAttribute("aria-valuenow", "50");
  await expect(health.locator(".MuiLinearProgress-bar")).toHaveAttribute(
    "style",
    /translateX\(-75%\)/,
  );
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
