import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

test("combat toggles persist, hotkeys ignore dialogs, and pointer input shows range", async ({
  page,
}) => {
  const inputs: Record<string, unknown>[] = [];
  const world: WorldState = {
    id: "fixture",
    name: "Combat controls",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Hero",
        x: 2400,
        y: 1280,
        color: 0,
        scene: "forest",
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
      },
    ],
    scene: {
      id: "run",
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: 1e9,
      nextSpawn: 1e9,
      sequence: 0,
      portals: [],
      enemies: [],
      damage: [],
      spawns: [],
      projectiles: [],
    },
  };
  await page.routeWebSocket("**/ws", (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "create")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
      if (message.type === "combatInput") inputs.push(message);
    });
  });
  await page.addInitScript(() => {
    const capture = {
      circles: 0,
      range: [] as number[],
      zone: [] as number[],
      zoneAlpha: 0,
    };
    (window as unknown as { rangeCapture: typeof capture }).rangeCapture = capture;
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (...args: Parameters<typeof arc>) {
      if (
        this.fillStyle === "rgba(82, 237, 135, 0.08)" &&
        args[2] === 88 &&
        args[4] === Math.PI * 2
      ) {
        capture.circles++;
        capture.range = [args[0], args[1], args[2]];
      }
      if (this.strokeStyle === "rgba(82, 237, 135, 0.2)") {
        capture.zone = [args[0], args[1], args[2]];
        capture.zoneAlpha = Number(String(this.fillStyle).match(/[\d.]+(?=\))/)?.[0]);
      }
      return arc.apply(this, args);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Auto-attack (F)", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Auto-target (G)", { exact: true })).toBeChecked();
  await page.keyboard.press("f");
  await expect(page.getByLabel("Auto-attack (F)", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: /^Close / }).click();
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect.poll(() => inputs.at(-1)?.autoAttack).toBe(true);
  await page.keyboard.press("f");
  await page.keyboard.press("g");
  await expect.poll(() => inputs.at(-1)?.autoAttack).toBe(false);
  await expect.poll(() => inputs.at(-1)?.autoTarget).toBe(false);
  await page.mouse.move(1200, 500);
  await page.mouse.down();
  await expect.poll(() => inputs.at(-1)?.attacking).toBe(true);
  expect(Number(inputs.at(-1)?.aimX)).toBeGreaterThan(2400);
  await page.mouse.up();
  await expect.poll(() => inputs.at(-1)?.attacking).toBe(false);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { rangeCapture: { circles: number } }).rangeCapture.circles,
      ),
    )
    .toBeGreaterThan(0);
  const marker = await page.evaluate(
    () =>
      (
        window as unknown as {
          rangeCapture: { range: number[]; zone: number[]; zoneAlpha: number };
        }
      ).rangeCapture,
  );
  expect(marker.zone).toEqual(marker.range);
  expect(marker.zoneAlpha).toBeGreaterThan(0);
  expect(marker.zoneAlpha).toBeLessThanOrEqual(0.1);
  await page.screenshot({ path: "test-results/manual-aim-range.png" });
  await page.mouse.down();
  await expect.poll(() => inputs.at(-1)?.attacking).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => inputs.at(-1)?.attacking).toBe(false);
  await page.mouse.up();
  await page.getByRole("button", { name: /^Close / }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Auto-attack (F)", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Auto-target (G)", { exact: true })).not.toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Auto-attack (F)", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Auto-target (G)", { exact: true })).not.toBeChecked();
});
