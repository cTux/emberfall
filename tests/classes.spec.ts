import { test, expect } from "./fixtures";
import type { WorldState } from "../packages/common/src/index";
import { nearbyInteraction, WARDROBE } from "../packages/common/src/index";

test("wardrobe selects and restores classes through the server", async ({ page }) => {
  await page.addInitScript(() => {
    const sprites = new WeakSet<HTMLCanvasElement>();
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLImageElement && args[0].src.endsWith("/wardrobe.png"))
          sprites.add(context.canvas);
        if (
          sprites.has(args[0]) &&
          context.canvas.getAttribute("aria-label")?.startsWith("Shared village")
        )
          document.body.dataset.wardrobeSprite = JSON.stringify({
            size: args.slice(-2),
            smoothing: context.imageSmoothingEnabled,
          });
        return Reflect.apply(target, context, args);
      },
    });
  });
  // A cold, delayed image must repaint the scenery and its shadow mask.
  await page.route("**/assets/wardrobe.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  let current: WorldState | undefined;
  let lastMovingSeq = 0;
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "move" && (message.x || message.y)) lastMovingSeq = message.seq;
    }),
  );
  page.on("websocket", (socket) =>
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "joined" || message.type === "state") current = message.world;
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute(
    "data-wardrobe-sprite",
    '{"size":[48,60],"smoothing":false}',
  );
  await page.screenshot({ path: "test-results/wardrobe-village.png" });
  await page.locator("canvas[aria-label^='Shared village']").click();
  // Short steps with acknowledgement prevent queued movement overshooting the wardrobe.
  for (let step = 0; step < 20 && Math.abs(current!.players[0].x - WARDROBE.x) >= 30; step++) {
    await page.keyboard.press(current!.players[0].x > WARDROBE.x ? "a" : "d", { delay: 80 });
    await expect.poll(() => (current?.players[0].inputSeq ?? 0) > lastMovingSeq).toBe(true);
  }
  expect(nearbyInteraction(current!.players[0])?.id).toBe("wardrobe");
  await page.keyboard.press("e");
  const wardrobe = page.getByRole("dialog", { name: "Wardrobe" });
  await expect(wardrobe).toBeVisible();
  await expect(wardrobe.getByRole("article")).toHaveCount(4);
  for (const name of ["Warrior", "Ranger", "Mage", "Druid"]) {
    await expect(wardrobe.getByRole("img", { name: `${name} portrait` })).toBeVisible();
  }
  const spell = wardrobe.getByRole("button", { name: "Base spell for Mage: Fireball" });
  await spell.hover();
  await expect(page.getByRole("tooltip")).toContainText("3 damage to its direct target");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toBeHidden();
  const tops = await wardrobe
    .getByRole("article")
    .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await page.screenshot({ path: "test-results/wardrobe-compact-desktop.png" });
  await wardrobe.getByRole("button", { name: /^Ranger/ }).click();
  await expect(wardrobe.getByRole("button", { name: /^Ranger/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".party article img")).toHaveAttribute("src", /ranger.png/);
  await wardrobe.getByRole("button", { name: /^Mage/ }).click();
  await expect(wardrobe.getByRole("button", { name: /^Mage/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await wardrobe.getByRole("button", { name: /^Druid/ }).click();
  await expect(wardrobe.getByRole("button", { name: /^Druid/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".party article img")).toHaveAttribute("src", /druid.png/);
  await expect(
    page.getByRole("progressbar", { name: "Bear", exact: true, includeHidden: true }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Bear portrait", includeHidden: true })).toBeVisible();
  await page.screenshot({ path: "test-results/wardrobe.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/wardrobe-compact-narrow.png" });
  expect(await wardrobe.evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.locator(".party article img")).toHaveAttribute("src", /druid.png/);
  await expect(
    page.getByRole("progressbar", { name: "Bear", exact: true, includeHidden: true }),
  ).toBeVisible();
});

test("classes show distinct attacks, Bear, roots, projectiles, explosions and debuffs", async ({
  page,
}) => {
  const world: WorldState = {
    id: "fixture",
    name: "Classes",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Mage",
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
        classId: "mage",
        attackAt: 9900,
      },
      {
        id: "r",
        name: "Ranger",
        x: 2320,
        y: 1280,
        color: 1,
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
        scene: "forest",
        classId: "ranger",
        attackAt: 9900,
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
      sequence: 10,
      nextSpawn: 99999,
      damage: [
        { id: 99, x: 2370, y: 1340, amount: 10, at: 10000, target: "enemy:99", killed: true },
      ],
      portals: [],
      enemies: [
        {
          id: 1,
          x: 2520,
          y: 1280,
          hitpoints: 30,
          maxHitpoints: 30,
          archetype: "brute",
          angle: 0,
          debuffs: [
            { kind: "bleed", stacks: 3, nextTick: 11000, expiresAt: 14000, ownerId: "p" },
            { kind: "poison", stacks: 4, nextTick: 11000, expiresAt: 14000, ownerId: "p" },
            { kind: "burn", stacks: 5, nextTick: 11000, expiresAt: 14000, ownerId: "p" },
          ],
        },
      ],
      playerShots: [
        {
          id: 2,
          kind: "arrow",
          ownerId: "r",
          x: 2380,
          y: 1250,
          angle: 0,
          remaining: 800,
          hitIds: [],
        },
        {
          id: 3,
          kind: "fireball",
          ownerId: "p",
          x: 2460,
          y: 1280,
          angle: 0,
          remaining: 900,
          hitIds: [],
          targetId: 1,
        },
      ],
      explosions: [{ id: 4, x: 2520, y: 1280, at: 9900 }],
    },
  };
  world.players.push({
    ...world.players[0],
    id: "d",
    name: "Druid",
    classId: "druid",
    x: 2400,
    y: 1390,
    bear: {
      id: "bear:d",
      name: "Bear",
      x: 2470,
      y: 1390,
      hitpoints: 120,
      maxHitpoints: 150,
      returning: false,
      attackAt: 9900,
      attackAngle: 0,
    },
  });
  world.players.push({
    ...world.players[0],
    id: "w",
    name: "Warrior",
    classId: "warrior",
    x: 2420,
    y: 1190,
  });
  world.scene!.enemies[0].kind = "boss";
  world.scene!.enemies[0].debuffs!.push({
    kind: "roots",
    stacks: 1,
    nextTick: 11000,
    expiresAt: 14000,
    ownerId: "d",
  });
  let sendState = () => {};
  await page.routeWebSocket("**/ws", (socket) => {
    socket.send(
      JSON.stringify({
        type: "worlds",
        worlds: [{ id: "fixture", name: "Playtest Default", players: 0, capacity: 32 }],
      }),
    );
    sendState = () => socket.send(JSON.stringify({ type: "state", world }));
    socket.onMessage((raw) => {
      if (JSON.parse(String(raw)).type === "join")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
    });
  });
  await page.addInitScript(() => {
    const capture = {
      icons: [] as { kind: string; x: number; y: number; width: number; height: number }[],
      rootLines: 0,
    };
    (window as unknown as { assetCapture: typeof capture }).assetCapture = capture;
    const proto = CanvasRenderingContext2D.prototype;
    const bars = new WeakMap<CanvasRenderingContext2D, { x: number; y: number; width: number }>();
    proto.fillRect = new Proxy(proto.fillRect, {
      apply(target, ctx, args) {
        if (ctx.fillStyle === "#101817" && args[3] === 7)
          bars.set(ctx, { x: args[0], y: args[1], width: args[2] });
        return Reflect.apply(target, ctx, args);
      },
    });
    proto.fill = new Proxy(proto.fill, {
      apply(target, ctx, args) {
        if (ctx.fillStyle === "#8c1728")
          document.body.setAttribute("data-blood-alpha", String(ctx.globalAlpha));
        return Reflect.apply(target, ctx, args);
      },
    });
    proto.stroke = new Proxy(proto.stroke, {
      apply(target, ctx, args) {
        if (ctx.strokeStyle === "#96d66b") capture.rootLines++;
        return Reflect.apply(target, ctx, args);
      },
    });
    proto.drawImage = new Proxy(proto.drawImage, {
      apply(target, ctx, args) {
        if (args[0] instanceof HTMLImageElement && args[0].src.endsWith("companion-boar.png")) {
          document.body.setAttribute("data-bear-frame", String(args[1]));
          document.body.setAttribute("data-bear-size", `${args[7]}x${args[8]}`);
          document.body.setAttribute("data-bear-source", `${args[2]},${args[3]}x${args[4]}`);
          document.body.setAttribute(
            "data-bear-facing",
            ctx.getTransform().a < 0 ? "left" : "right",
          );
          document.body.setAttribute("data-bear", "drawn");
          if (args[1] > 0) document.body.setAttribute("data-bear-walk", "animated");
        }
        if (args[0] instanceof HTMLImageElement && args[0].src.includes("-attack.png"))
          document.body.setAttribute(
            `data-${args[0].src.split("/").at(-1)!.replace(".png", "")}`,
            "drawn",
          );
        if (args[0] instanceof HTMLImageElement && args[0].src.includes("/assets/weapons/"))
          document.body.setAttribute(
            `data-weapon-${args[0].src.split("/").at(-1)!.replace(".png", "")}`,
            "drawn",
          );
        if (args[0] instanceof HTMLImageElement && args[0].src.includes("/assets/status/")) {
          const kind = args[0].src.split("/").at(-1)!.replace(".svg", "");
          document.body.setAttribute(`data-icon-${kind}`, "drawn");
          capture.icons.push({ kind, x: args[1], y: args[2], width: args[3], height: args[4] });
          if (capture.icons.length > 100) capture.icons.splice(0, 4);
        }
        return Reflect.apply(target, ctx, args);
      },
    });
    proto.fillText = new Proxy(proto.fillText, {
      apply(target, ctx, args) {
        if (["Mage", "Boar"].includes(args[0])) {
          const bar = bars.get(ctx);
          if (
            bar &&
            args[1] === bar.x + bar.width / 2 &&
            args[2] === bar.y + 7 + ctx.measureText(args[0]).actualBoundingBoxAscent
          )
            document.body.setAttribute(`data-name-${args[0].toLowerCase()}`, ctx.font);
        }
        if (ctx.font === 'bold 8px "Alegreya Sans", sans-serif')
          document.body.setAttribute(`data-debuff-${args[0]}`, String(ctx.fillStyle));
        return Reflect.apply(target, ctx, args);
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-mage-attack", "drawn");
  await expect(page.locator("body")).toHaveAttribute("data-ranger-attack", "drawn");
  await expect(page.locator("body")).toHaveAttribute("data-druid-attack", "drawn");
  await expect(page.locator("body")).toHaveAttribute("data-bear", "drawn");
  for (const kind of ["bleed", "poison", "burn", "roots"])
    await expect(page.locator("body")).toHaveAttribute(`data-icon-${kind}`, "drawn");
  for (const id of ["warrior", "ranger", "mage", "druid"])
    await expect(page.locator("body")).toHaveAttribute(`data-weapon-${id}`, "drawn");
  for (const stacks of ["1", "3", "4", "5"])
    await expect(page.locator("body")).toHaveAttribute(`data-debuff-${stacks}`, "#ffffff");
  const capture = await page.evaluate(
    () =>
      (
        window as unknown as {
          assetCapture: {
            icons: { kind: string; x: number; y: number; width: number; height: number }[];
            rootLines: number;
          };
        }
      ).assetCapture,
  );
  const row = capture.icons.slice(-4);
  expect(row.map((icon) => icon.kind)).toEqual(["bleed", "poison", "burn", "roots"]);
  expect(row.every((icon) => icon.width === 12 && icon.height === 12 && icon.y === row[0].y)).toBe(
    true,
  );
  expect(row.slice(1).every((icon, index) => icon.x - row[index].x === 14)).toBe(true);
  for (const name of ["mage", "boar"])
    await expect(page.locator("body")).toHaveAttribute(
      `data-name-${name}`,
      '8px "Alegreya Sans", sans-serif',
    );
  await expect
    .poll(async () => Number(await page.locator("body").getAttribute("data-blood-alpha")))
    .toBeCloseTo(0.5, 1);
  expect(capture.rootLines).toBe(0);
  await page.screenshot({ path: "test-results/class-combat.png" });
  await expect(page.locator("body")).toHaveAttribute("data-bear-size", "42.5x40");
  await expect(page.locator("body")).toHaveAttribute("data-bear-source", "0,17x16");
  await expect(page.locator("body")).toHaveAttribute("data-bear-facing", "right");
  await expect(page.locator("body")).toHaveAttribute("data-bear-frame", "0");
  await expect(page.locator("body")).not.toHaveAttribute("data-bear-walk");
  for (let i = 0; i < 20; i++) {
    world.serverNow! += 50;
    world.players[2].bear!.x += 4;
    world.players[2].bear!.moving = true;
    sendState();
    await page.waitForTimeout(30);
  }
  await expect(page.locator("body")).toHaveAttribute("data-bear-walk", "animated");
  await page.waitForTimeout(300);
  await expect(page.locator("body")).toHaveAttribute("data-bear-frame", "0");
  world.players[2].bear!.attackAngle = Math.PI;
  for (let i = 0; i < 10; i++) {
    world.serverNow! += 50;
    sendState();
    await page.waitForTimeout(30);
  }
  await expect(page.locator("body")).toHaveAttribute("data-bear-facing", "left");
  await page.screenshot({ path: "test-results/boar-companion.png" });
  world.scene!.damage = [];
  world.serverNow = 25000;
  // Fill the snapshot buffer to advance its confirmed clock without a real 15-second wait.
  for (let i = 0; i < 20; i++) {
    world.serverNow++;
    sendState();
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(4500);
  await expect
    .poll(async () => Number(await page.locator("body").getAttribute("data-blood-alpha")))
    .toBeCloseTo(0.25, 1);
  await page.evaluate(() => {
    (window as unknown as { assetCapture: { icons: unknown[] } }).assetCapture.icons = [];
  });
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () => (window as unknown as { assetCapture: { icons: unknown[] } }).assetCapture.icons.length,
    ),
  ).toBe(0);
  world.serverNow = 40000;
  // An expired event must not recreate a removed puddle.
  world.scene!.damage = [
    { id: 99, x: 2370, y: 1340, amount: 10, at: 10000, target: "enemy:99", killed: true },
  ];
  for (let i = 0; i < 20; i++) {
    world.serverNow++;
    sendState();
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(4500);
  await page.locator("body").evaluate((body) => body.removeAttribute("data-blood-alpha"));
  await page.waitForTimeout(150);
  await expect(page.locator("body")).not.toHaveAttribute("data-blood-alpha");
});
