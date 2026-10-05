import { test, expect } from "./fixtures";
import { TREES, forestTrees } from "../packages/common/src/index";
import type { WorldState } from "../packages/common/src/index";

for (const forest of [false, true]) {
  test(`trees fade and vegetation waves on demand in ${forest ? "forest" : "village"}`, async ({
    page,
  }) => {
    const tree = forest ? forestTrees(1200, 700, 100)[0] : TREES[0];
    const treeY = tree.y - (forest ? 0 : 8);
    const world: WorldState = {
      id: "fixture",
      name: "Trees",
      hostId: "p",
      serverNow: 10000,
      players: [
        {
          id: "p",
          name: "Hero",
          x: tree.x,
          y: treeY - 50,
          color: 0,
          hitpoints: 100,
          maxHitpoints: 100,
          level: 1,
          experience: 0,
          playtimeSeconds: 0,
          scene: forest ? "forest" : undefined,
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
    let update = () => {};
    await page.routeWebSocket("**/ws", (socket) => {
      socket.send(
        JSON.stringify({
          type: "worlds",
          worlds: [{ id: "fixture", name: "Playtest Default", players: 0, capacity: 32 }],
        }),
      );
      update = () => socket.send(JSON.stringify({ type: "state", world }));
      socket.onMessage((raw) => {
        if (JSON.parse(String(raw)).type === "join")
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
    await page.addInitScript(
      ({ left, top }) => {
        const samples = { tree: [] as number[], grass: [] as number[] };
        const grassSamples = new Map<string, number[]>();
        let roundShadows = 0;
        const ellipse = CanvasRenderingContext2D.prototype.ellipse;
        CanvasRenderingContext2D.prototype.ellipse = new Proxy(ellipse, {
          apply(target, ctx: CanvasRenderingContext2D, args) {
            if (ctx.canvas.hasAttribute("aria-label") && args[2] === 23 && args[3] === 8) {
              document.body.dataset.roundTreeShadows = String(++roundShadows);
            }
            return Reflect.apply(target, ctx, args);
          },
        });
        const draw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
          apply(target, ctx: CanvasRenderingContext2D, args) {
            if (
              ctx.canvas.hasAttribute("aria-label") &&
              args.length === 3 &&
              args[0] instanceof HTMLCanvasElement &&
              args[0].width === 320
            ) {
              roundShadows = 0;
              document.body.dataset.roundTreeShadows = "0";
            }
            if (
              ctx.canvas.hasAttribute("aria-label") &&
              args.length === 5 &&
              args[0] instanceof HTMLCanvasElement &&
              args[0].width === 32 &&
              Math.abs(args[1] - left) < 0.01 &&
              Math.abs(args[2] - top) < 0.01
            ) {
              document.body.dataset.treeOpacity = String(ctx.globalAlpha);
              const matrix = ctx.getTransform();
              samples.tree.push(matrix.c / matrix.a);
              if (samples.tree.length > 120) samples.tree.shift();
              document.body.dataset.treeSway = String(matrix.c / matrix.a);
              document.body.dataset.treeSwayRange = String(
                Math.max(...samples.tree) - Math.min(...samples.tree),
              );
              // The horizontal contribution of sway must cancel at the root.
              document.body.dataset.rootOffset = String(
                (matrix.c * (args[2] + args[4]) + matrix.e) / matrix.a,
              );
            }
            if (
              ctx.canvas.hasAttribute("aria-label") &&
              args.length === 5 &&
              args[0] instanceof HTMLCanvasElement &&
              args[0].width === 16 &&
              args[3] <= 22 &&
              args[4] <= 22 &&
              document.querySelector('[aria-label="Leave world"]')
            ) {
              const position = `${args[1]}:${args[2]}`;
              const shear = ctx.getTransform().c / ctx.getTransform().a;
              const values = grassSamples.get(position) ?? [];
              grassSamples.set(position, values);
              values.push(shear);
              if (values.length > 120) values.shift();
              document.body.dataset.grassSway = String(shear);
              document.body.dataset.grassSwayRange = String(
                Math.max(...values) - Math.min(...values),
              );
            }
            return Reflect.apply(target, ctx, args);
          },
        });
      },
      { left: tree.x - tree.size / 2, top: treeY - tree.size },
    );
    await page.goto("/");
    await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
    await expect(page.locator("body")).toHaveAttribute("data-tree-opacity", "0.2");
    await expect
      .poll(() => page.locator("body").getAttribute("data-tree-sway-range").then(Number))
      .toBeGreaterThan(0.001);
    await expect
      .poll(() => page.locator("body").getAttribute("data-grass-sway-range").then(Number))
      .toBeGreaterThan(0.001);
    const rootBefore = Number(await page.locator("body").getAttribute("data-root-offset"));
    await page.screenshot({ path: `test-results/tree-fade-${forest ? "forest" : "village"}.png` });
    world.players[0].y = treeY + 30;
    world.serverNow! += 200;
    update();
    await expect(page.locator("body")).toHaveAttribute("data-tree-opacity", "1");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Graphics", exact: true }).click();
    await page.getByLabel("Waving grass and trees").uncheck();
    await expect(page.locator("body")).toHaveAttribute("data-tree-sway", "0");
    await expect(page.locator("body")).toHaveAttribute("data-grass-sway", "0");
    expect(Number(await page.locator("body").getAttribute("data-root-offset"))).toBeCloseTo(
      rootBefore,
      3,
    );
    await page.getByLabel("Waving grass and trees").check();
    await expect
      .poll(() => page.locator("body").getAttribute("data-tree-sway").then(Number))
      .not.toBe(0);
    await expect
      .poll(() => page.locator("body").getAttribute("data-grass-sway").then(Number))
      .not.toBe(0);
    if (forest) {
      await expect(page.locator("body")).toHaveAttribute("data-round-tree-shadows", "0");
      await page.getByRole("button", { name: "Low", exact: true }).click();
      await expect
        .poll(() => page.locator("body").getAttribute("data-round-tree-shadows").then(Number))
        .toBeGreaterThan(0);
      for (const preset of ["Balanced", "High"]) {
        await page.getByRole("button", { name: preset, exact: true }).click();
        await expect(page.locator("body")).toHaveAttribute("data-round-tree-shadows", "0");
      }
    }
  });
}
