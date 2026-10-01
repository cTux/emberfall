import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";
import { nearbyInteraction } from "../packages/common/src/index";

test("wardrobe selects and restores classes through the server", async ({ page }) => {
  let current: WorldState | undefined;
  page.on("websocket", (socket) =>
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "joined" || message.type === "state") current = message.world;
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.locator("canvas[aria-label^='Shared village']").click();
  await expect
    .poll(async () => {
      await page.keyboard.down("a");
      const player = current?.players[0];
      return player
        ? (nearbyInteraction(player)?.id ?? `position:${player.x},${player.y}`)
        : "waiting for state";
    })
    .toBe("wardrobe");
  await page.keyboard.up("a");
  await page.keyboard.press("e");
  const wardrobe = page.getByRole("dialog", { name: "Wardrobe" });
  await expect(wardrobe).toBeVisible();
  await wardrobe.getByRole("button", { name: /^Ranger/ }).click();
  await expect(wardrobe.getByRole("button", { name: /^Ranger/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".party-member .portrait")).toHaveCSS("background-image", /ranger.png/);
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
  await expect(page.locator(".party-member .portrait")).toHaveCSS("background-image", /druid.png/);
  await page.screenshot({ path: "test-results/wardrobe.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Leave world" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.locator(".party-member .portrait")).toHaveCSS("background-image", /druid.png/);
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
      damage: [],
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
  world.scene!.enemies[0].kind = "boss";
  world.scene!.enemies[0].debuffs!.push({
    kind: "roots",
    stacks: 1,
    nextTick: 11000,
    expiresAt: 14000,
    ownerId: "d",
  });
  await page.routeWebSocket("**/ws", (socket) =>
    socket.onMessage((raw) => {
      if (JSON.parse(String(raw)).type === "create")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
    }),
  );
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    proto.drawImage = new Proxy(proto.drawImage, {
      apply(target, ctx, args) {
        if (
          args[0] instanceof HTMLImageElement &&
          (args[0].src.includes("-attack.png") || args[0].src.endsWith("bear.png"))
        )
          document.body.setAttribute(
            `data-${args[0].src.split("/").at(-1)!.replace(".png", "")}`,
            "drawn",
          );
        return Reflect.apply(target, ctx, args);
      },
    });
    proto.fillText = new Proxy(proto.fillText, {
      apply(target, ctx, args) {
        if (ctx.font === "bold 8px system-ui")
          document.body.setAttribute(`data-debuff-${args[0]}`, String(ctx.fillStyle));
        return Reflect.apply(target, ctx, args);
      },
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-mage-attack", "drawn");
  await expect(page.locator("body")).toHaveAttribute("data-ranger-attack", "drawn");
  await expect(page.locator("body")).toHaveAttribute("data-druid-attack", "drawn");
  await expect(page.locator("body")).toHaveAttribute("data-bear", "drawn");
  await expect(page.locator("body")).toHaveAttribute("data-debuff-3", "#ff6575");
  await expect(page.locator("body")).toHaveAttribute("data-debuff-4", "#9deb65");
  await expect(page.locator("body")).toHaveAttribute("data-debuff-5", "#ffb74e");
  await expect(page.locator("body")).toHaveAttribute("data-debuff-R", "#9deb65");
  await page.screenshot({ path: "test-results/class-combat.png" });
});
