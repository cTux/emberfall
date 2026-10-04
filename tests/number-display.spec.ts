import { test, expect } from "./fixtures";
import type { WorldState } from "../packages/common/src/index";

test("fractional stats and damage render as whole numbers in wardrobe, HUD and both scenes", async ({
  page,
}) => {
  const progress = {
    level: 1,
    experience: Number("2760.3999999999944"),
    hitpoints: 75.6,
    maxHitpoints: 100.4,
    manapoints: 20.4,
    maxManapoints: 50.6,
    playtimeSeconds: 0,
  };
  const world: WorldState = {
    id: "rounding",
    name: "Rounding fixture",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        ...progress,
        id: "p",
        name: "Hero",
        x: 350,
        y: 395,
        color: 0,
        dps: 12.6,
        classes: { warrior: progress, ranger: progress, mage: progress, druid: progress },
      },
    ],
    training: {
      id: "training",
      training: true,
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: null,
      sequence: 1,
      nextSpawn: 1e9,
      portals: [],
      enemies: [],
      damage: [{ id: 1, x: 350, y: 395, amount: 7.6, at: 10000, target: "enemy:1" }],
    },
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
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
    });
  });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y) {
      if (this.font === 'bold 14px "Alegreya Sans", sans-serif') {
        const labels = JSON.parse(document.body.dataset.damageLabels ?? "[]") as string[];
        if (!labels.includes(text)) {
          labels.push(text);
          document.body.dataset.damageLabels = JSON.stringify(labels);
        }
      }
      original.call(this, text, x, y);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  const party = page.getByRole("article", { name: "Hero", exact: true });
  await expect(party.getByText("76 / 100", { exact: true })).toBeVisible();
  await expect(party.getByRole("progressbar")).toHaveCount(1);
  await expect(party.getByRole("progressbar", { name: "Hero, lvl 1" })).toHaveAttribute(
    "aria-valuenow",
    "75.6",
  );
  await expect(page.getByLabel("Damage per second", { exact: true })).toContainText("13 DPS");
  await expect(page.locator("body")).toHaveAttribute("data-damage-labels", '["8"]');
  await page.keyboard.press("e");
  const wardrobe = page.getByRole("dialog", { name: "Wardrobe" });
  await expect(wardrobe.getByText("Power", { exact: true })).toHaveCount(4);
  await expect(wardrobe.getByText("MP", { exact: true })).toHaveCount(0);
  await expect(wardrobe.locator("dd").filter({ hasText: /^2760$/ })).toHaveCount(4);
  await page.screenshot({ path: "test-results/rounded-wardrobe.png" });
  await page.keyboard.press("Escape");
  world.players[0].scene = "forest";
  world.players[0].x = 2400;
  world.players[0].y = 1280;
  world.serverNow = 11000;
  world.scene = {
    ...world.training!,
    id: "forest",
    training: false,
    bossId: 2,
    endsAt: 120000,
    damage: [{ id: 2, x: 2400, y: 1280, amount: 3.4, at: 11000, target: "enemy:2" }],
    enemies: [
      { id: 2, x: 2450, y: 1280, kind: "boss", hitpoints: 135.6, maxHitpoints: 200, angle: 0 },
    ],
  };
  update();
  await expect(
    page.getByLabel("Boss health", { exact: true }).getByText("136 / 200", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.locator("body").getAttribute("data-damage-labels"))
    .toBe('["8","3"]');
  expect(world.players[0].experience).toBe(progress.experience);
});
