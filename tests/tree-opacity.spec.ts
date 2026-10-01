import { test, expect } from "@playwright/test";
import { TREES, forestTrees } from "../packages/common/src/index";
import type { WorldState } from "../packages/common/src/index";

for (const forest of [false, true]) {
  test(`covering trees fade and recover in ${forest ? "forest" : "village"}`, async ({ page }) => {
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
          manapoints: 50,
          maxManapoints: 50,
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
      update = () => socket.send(JSON.stringify({ type: "state", world }));
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
    await page.addInitScript(
      ({ left, top }) => {
        const draw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
          apply(target, ctx: CanvasRenderingContext2D, args) {
            if (
              ctx.canvas.hasAttribute("aria-label") &&
              args.length === 5 &&
              args[0] instanceof HTMLCanvasElement &&
              args[0].width === 32 &&
              Math.abs(args[1] - left) < 0.01 &&
              Math.abs(args[2] - top) < 0.01
            )
              document.body.dataset.treeOpacity = String(ctx.globalAlpha);
            return Reflect.apply(target, ctx, args);
          },
        });
      },
      { left: tree.x - tree.size / 2, top: treeY - tree.size },
    );
    await page.goto("/");
    await page.getByRole("tab", { name: "Create a world" }).click();
    await page.getByRole("button", { name: "Light the ember" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-tree-opacity", "0.15");
    await page.screenshot({ path: `test-results/tree-fade-${forest ? "forest" : "village"}.png` });
    world.players[0].y = treeY + 30;
    world.serverNow! += 200;
    update();
    await expect(page.locator("body")).toHaveAttribute("data-tree-opacity", "1");
  });
}
