import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

test("building nameplate replaces the tooltip in interaction range", async ({ page }) => {
  const world: WorldState = {
    id: "fixture",
    name: "Village",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Visitor",
        x: 235,
        y: 260,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
        attackAt: 0,
      },
    ],
  };
  let update = () => {};
  await page.routeWebSocket("**/ws", (socket) => {
    update = () => socket.send(JSON.stringify({ type: "state", world }));
    socket.onMessage((raw) => {
      if (JSON.parse(String(raw)).type === "create")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
    });
  });
  await page.addInitScript(() => {
    const backgrounds = new WeakMap<CanvasRenderingContext2D, string>();
    const prototype = CanvasRenderingContext2D.prototype;
    const rect = prototype.fillRect;
    prototype.fillRect = function (x, y, width, height) {
      if (height === 13) backgrounds.set(this, String(this.fillStyle));
      rect.call(this, x, y, width, height);
    };
    const text = prototype.fillText;
    prototype.fillText = function (value, x, y) {
      if (this.font === '9px "Pixelify Sans", sans-serif' && value.endsWith("Inn")) {
        document.body.dataset.innLabel = value;
        document.body.dataset.innBackground = backgrounds.get(this);
      }
      if (this.font === '9px "Pixelify Sans", sans-serif' && value.endsWith("portal")) {
        document.body.dataset.portalLabel = value;
        document.body.dataset.portalBackground = backgrounds.get(this);
      }
      text.call(this, value, x, y);
    };
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-inn-label", "(E) Inn");
  await expect(page.locator("body")).toHaveAttribute("data-inn-background", "#786747");
  await expect(page.locator(".source-tooltip")).toBeHidden();
  await page.screenshot({ path: "test-results/building-nameplate.png" });
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toContainText("Inn services");
  await page.keyboard.press("Escape");
  Object.assign(world.players[0], { x: 480, y: 600 });
  world.serverNow = (world.serverNow ?? 0) + 50;
  update();
  await expect(page.locator("body")).toHaveAttribute("data-inn-label", "Inn");
  await expect(page.locator("body")).toHaveAttribute("data-inn-background", "#302d20");
  await expect(page.locator(".source-tooltip")).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute("data-portal-label", "Forest portal");
  await expect(page.locator("body")).toHaveAttribute("data-portal-background", "#302d20");
  Object.assign(world.players[0], { x: 550, y: 350 });
  world.serverNow = (world.serverNow ?? 0) + 50;
  update();
  await expect(page.locator("body")).toHaveAttribute("data-portal-label", "(E) Forest portal");
  await expect(page.locator("body")).toHaveAttribute("data-portal-background", "#786747");
  await expect(page.locator(".source-tooltip")).toHaveCount(0);
  await page.screenshot({ path: "test-results/portal-nameplate.png" });
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toContainText("Forest portal");
});
