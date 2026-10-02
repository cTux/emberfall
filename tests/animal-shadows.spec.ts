import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

for (const forest of [false, true]) {
  test(`animal silhouettes follow shadow quality in ${forest ? "forest" : "village"}`, async ({
    page,
  }) => {
    const x = forest ? 2400 : 420,
      y = forest ? 1140 : 340;
    const world: WorldState = {
      id: "shadows",
      name: "Shadows",
      hostId: "p",
      serverNow: 10000,
      players: [
        {
          id: "p",
          name: "Druid",
          classId: "druid",
          x,
          y,
          color: 0,
          hitpoints: 100,
          maxHitpoints: 100,
          manapoints: 50,
          maxManapoints: 50,
          level: 1,
          experience: 0,
          playtimeSeconds: 0,
          scene: forest ? "forest" : undefined,
          bear: {
            id: "bear",
            name: "Bear",
            x: x + 60,
            y,
            hitpoints: 100,
            maxHitpoints: 100,
            returning: false,
            moving: true,
            attackAngle: Math.PI,
          },
        },
      ],
      scene: forest
        ? {
            id: "forest",
            type: "Forest",
            difficulty: "Easy",
            phase: "active",
            ready: [],
            countdownAt: null,
            endsAt: 120000,
            nextSpawn: 1e9,
            sequence: 0,
            enemies: [],
            damage: [],
            portals: [],
          }
        : undefined,
    };
    await page.routeWebSocket("**/ws", (socket) => {
      socket.onMessage((raw) => {
        if (JSON.parse(String(raw)).type === "create")
          socket.send(
            JSON.stringify({
              type: "joined",
              playerId: "p",
              world,
              characterToken: "a".repeat(64),
            }),
          );
      });
    });
    await page.addInitScript(() => {
      const sources = new WeakMap<HTMLCanvasElement, string>();
      const reflections = new WeakSet<HTMLCanvasElement>();
      const proto = CanvasRenderingContext2D.prototype;
      proto.fillRect = new Proxy(proto.fillRect, {
        apply(target, ctx: CanvasRenderingContext2D, args) {
          if (ctx.globalCompositeOperation === "destination-in") reflections.add(ctx.canvas);
          return Reflect.apply(target, ctx, args);
        },
      });
      proto.drawImage = new Proxy(proto.drawImage, {
        apply(target, ctx: CanvasRenderingContext2D, args) {
          const source =
            args[0] instanceof HTMLImageElement
              ? args[0].src
              : args[0] instanceof HTMLCanvasElement
                ? sources.get(args[0])
                : undefined;
          if (source) sources.set(ctx.canvas, source);
          if (
            args[0] instanceof HTMLCanvasElement &&
            reflections.has(args[0]) &&
            ctx.canvas.hasAttribute("aria-label")
          ) {
            document.body.dataset.reflections = "yes";
            if (source?.endsWith("/companion-boar.png"))
              document.body.dataset.bearReflection = "yes";
            if (source && /\/critter-\w+\.png$/.test(source))
              document.body.dataset.critterReflection = "yes";
          }
          if (
            source &&
            /\/(companion-boar|critter-\w+)\.png$/.test(source) &&
            args[0] instanceof HTMLCanvasElement &&
            args.length === 5
          ) {
            const kind = source.endsWith("/companion-boar.png") ? "bear" : "critter";
            const pass = ctx.canvas.hasAttribute("aria-label") ? "sun" : "light";
            document.body.dataset[`${kind}${pass}`] = "yes";
          }
          return Reflect.apply(target, ctx, args);
        },
      });
      proto.ellipse = new Proxy(proto.ellipse, {
        apply(target, ctx: CanvasRenderingContext2D, args) {
          if (ctx.canvas.hasAttribute("aria-label")) {
            if (args[2] === 8 && args[3] === 3) document.body.dataset.critterOval = "yes";
            if (args[2] === 15 && args[3] === 6) document.body.dataset.bearOval = "yes";
          }
          return Reflect.apply(target, ctx, args);
        },
      });
    });
    await page.goto("/");
    await page.getByRole("tab", { name: "Create a world" }).click();
    await page.getByRole("button", { name: "Light the ember" }).click();
    await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
    for (const preset of ["Low", "Balanced", "High"]) {
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("tab", { name: "Graphics", exact: true }).click();
      await page.getByRole("button", { name: preset, exact: true }).click();
      await page.getByRole("button", { name: /^Close / }).click();
      await page.evaluate(() => {
        for (const key of [
          "bearsun",
          "crittersun",
          "bearlight",
          "critterlight",
          "bearOval",
          "critterOval",
          "reflections",
          "bearReflection",
          "critterReflection",
        ])
          delete document.body.dataset[key];
      });
      if (preset === "Low") {
        await expect(page.locator("body")).toHaveAttribute("data-bear-oval", "yes");
        await expect(page.locator("body")).toHaveAttribute("data-critter-oval", "yes");
        expect(await page.locator("body").getAttribute("data-bearsun")).toBeNull();
        expect(await page.locator("body").getAttribute("data-crittersun")).toBeNull();
        expect(await page.locator("body").getAttribute("data-reflections")).toBeNull();
      } else {
        await expect(page.locator("body")).toHaveAttribute("data-bearsun", "yes");
        await expect(page.locator("body")).toHaveAttribute("data-crittersun", "yes");
        await expect(page.locator("body")).toHaveAttribute("data-bearlight", "yes");
        await expect(page.locator("body")).toHaveAttribute("data-critterlight", "yes");
        expect(await page.locator("body").getAttribute("data-bear-oval")).toBeNull();
        expect(await page.locator("body").getAttribute("data-critter-oval")).toBeNull();
        await expect(page.locator("body")).toHaveAttribute("data-bear-reflection", "yes");
        await expect(page.locator("body")).toHaveAttribute("data-critter-reflection", "yes");
      }
      await page.screenshot({
        path: `test-results/animals-${forest ? "forest" : "village"}-${preset}.png`,
      });
    }
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Reflections (2D)", { exact: true }).uncheck();
    await page.getByRole("button", { name: /^Close / }).click();
    await page.waitForTimeout(100);
    await page.evaluate(() => delete document.body.dataset.reflections);
    await page.waitForTimeout(150);
    expect(await page.locator("body").getAttribute("data-reflections")).toBeNull();
  });
}
