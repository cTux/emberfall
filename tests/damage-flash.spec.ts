import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

for (const forest of [true, false]) {
  test(`damage flashes red and white in ${forest ? "forest" : "training"}, expires and restarts`, async ({
    page,
  }) => {
    const x = forest ? 2400 : 420;
    const y = forest ? 1280 : 340;
    const player = {
      id: "p",
      name: "Hunter",
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
      scene: forest ? ("forest" as const) : undefined,
      bear: {
        id: "bear:p",
        name: "Bear" as const,
        x: x + 90,
        y,
        hitpoints: 100,
        maxHitpoints: 100,
        returning: false,
        hurtAt: 9900,
      },
    };
    const enemies = [
      { id: 1, x: x - 90, y, hitpoints: 10, angle: 0, maxHitpoints: 100 },
      ...(forest
        ? [
            {
              id: 2,
              x: x - 160,
              y,
              hitpoints: 50,
              angle: 0,
              archetype: "brute" as const,
              kind: "elite" as const,
            },
            {
              id: 3,
              x: x + 160,
              y,
              hitpoints: 100,
              angle: 0,
              archetype: "caster" as const,
              kind: "boss" as const,
            },
            { id: 4, x: x - 220, y, hitpoints: 0, angle: 0 },
          ]
        : []),
    ];
    const combat = {
      enemies,
      damage: enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        amount: 5,
        at: 9900,
        target: `enemy:${e.id}`,
        killed: e.hitpoints === 0,
      })),
    };
    combat.damage.push({
      id: 10,
      x: x + 250,
      y,
      amount: 5,
      at: 9900,
      target: "remote",
      killed: false,
    });
    const world: WorldState = {
      id: "hits",
      name: "Hits",
      hostId: "p",
      serverNow: 10000,
      players: [player, { ...player, id: "remote", name: "Remote", x: x + 250, bear: undefined }],
      scene: forest
        ? {
            ...combat,
            id: "forest",
            type: "Forest",
            difficulty: "Easy",
            phase: "active",
            ready: [],
            countdownAt: null,
            endsAt: 120000,
            nextSpawn: 1e9,
            sequence: 10,
            portals: [],
          }
        : undefined,
      training: forest
        ? undefined
        : {
            ...combat,
            sequence: 10,
            playerShots: [],
            id: "training",
            type: "Forest",
            difficulty: "Easy",
            phase: "active",
            ready: [],
            countdownAt: null,
            endsAt: 120000,
            nextSpawn: 1e9,
            portals: [],
          },
    };
    let sendState = () => {};
    await page.routeWebSocket("**/ws", (socket) => {
      sendState = () => socket.send(JSON.stringify({ type: "state", world }));
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
      const colors = new WeakMap<HTMLCanvasElement, string>();
      const capture: { color: string; x: number; alpha: number; pixels: number[] }[] = [];
      (window as unknown as { hits: typeof capture }).hits = capture;
      const proto = CanvasRenderingContext2D.prototype;
      proto.fillRect = new Proxy(proto.fillRect, {
        apply(target, ctx: CanvasRenderingContext2D, args) {
          if (
            ctx.globalCompositeOperation === "source-in" &&
            ["#ffffff", "#ff3737"].includes(String(ctx.fillStyle))
          )
            colors.set(ctx.canvas, String(ctx.fillStyle));
          return Reflect.apply(target, ctx, args);
        },
      });
      proto.drawImage = new Proxy(proto.drawImage, {
        apply(target, ctx: CanvasRenderingContext2D, args) {
          const color = args[0] instanceof HTMLCanvasElement ? colors.get(args[0]) : undefined;
          if (color && ctx.canvas.hasAttribute("aria-label")) {
            const source = args[0] as HTMLCanvasElement;
            const pixels = source
              .getContext("2d")!
              .getImageData(0, 0, source.width, source.height).data;
            const i = pixels.findIndex((v, i) => i % 4 === 3 && v > 0);
            capture.push({
              color,
              x: args[1],
              alpha: ctx.globalAlpha,
              pixels: Array.from(pixels.slice(i - 3, i + 1)),
            });
            if (capture.length > 300) capture.shift();
          }
          return Reflect.apply(target, ctx, args);
        },
      });
    });
    await page.goto("/");
    await page.getByRole("tab", { name: "Create a world" }).click();
    await page.getByRole("button", { name: "Light the ember" }).click();
    const hits = () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              hits: { color: string; x: number; alpha: number; pixels: number[] }[];
            }
          ).hits,
      );
    await expect
      .poll(async () => (await hits()).filter((h) => h.color === "#ffffff").length)
      .toBeGreaterThan(0);
    const active = await hits();
    expect(
      active.some((h) => h.color === "#ff3737" && h.pixels.slice(0, 3).join() === "255,55,55"),
    ).toBe(true);
    expect(
      active.some((h) => h.color === "#ffffff" && h.pixels.slice(0, 3).join() === "255,255,255"),
    ).toBe(true);
    expect(active.some((h) => h.x === x - 114 && h.color === "#ffffff")).toBe(true);
    expect(active.some((h) => h.x === x + 90 - 21.25 && h.color === "#ffffff")).toBe(true);
    expect(active.some((h) => h.x === x + 250 - 24)).toBe(false);
    if (forest) {
      expect(active.some((h) => h.x === x - 160 - 34)).toBe(true);
      expect(active.some((h) => h.x === x + 160 - 22)).toBe(true);
      expect(active.some((h) => h.x === -24)).toBe(true); // transformed killing-blow sprite
    }
    await page.screenshot({
      path: `test-results/damage-flash-${forest ? "forest" : "training"}.png`,
    });
    world.serverNow = 10400;
    sendState();
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      (window as unknown as { hits: unknown[] }).hits.length = 0;
    });
    await page.waitForTimeout(150);
    expect(await hits()).toEqual([]);
    combat.damage.push({
      id: 11,
      x: enemies[0].x,
      y,
      amount: 1,
      at: 10400,
      target: "enemy:1",
      killed: false,
    });
    sendState();
    await expect
      .poll(async () => (await hits()).some((h) => h.x === x - 114 && h.color === "#ffffff"))
      .toBe(true);
  });
}
