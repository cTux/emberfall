import { test, expect } from "@playwright/test";
import { CLASS_IDS, tickTraining } from "../packages/common/src/index";
import type { WorldState } from "../packages/common/src/index";

test("all classes sheath weapons outside combat and draw them in forest and training", async ({
  page,
}) => {
  const world: WorldState = {
    id: "fixture",
    name: "Weapon visibility",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Adventurer",
        x: 480,
        y: 340,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
      },
    ],
    training: tickTraining(undefined, [], 10000, 0),
  };
  world.scene = { ...world.training!, id: "forest", training: false, phase: "active", enemies: [] };
  let sendState = () => {};
  await page.routeWebSocket("**/ws", (socket) => {
    sendState = () => socket.send(JSON.stringify({ type: "state", world }));
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "create")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
      if (message.type === "move") {
        world.players[0].inputSeq = message.seq;
        sendState();
      }
    });
  });
  await page.addInitScript(() => {
    const capture = { weapons: 0, players: 0 };
    (window as unknown as { weaponCapture: typeof capture }).weaponCapture = capture;
    const prototype = CanvasRenderingContext2D.prototype;
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLImageElement) {
          if (args[0].src.includes("/assets/weapons/")) capture.weapons++;
          if (
            /\/assets\/(knight|warrior-attack|ranger|ranger-attack|mage|mage-attack|druid|druid-attack)\.png$/.test(
              args[0].src,
            )
          )
            capture.players++;
        }
        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  for (const classId of CLASS_IDS) {
    world.players[0].classId = classId;
    for (const state of [
      "village",
      "training",
      "village",
      "countdown",
      "active",
      "dead",
      "ended",
      "village",
    ]) {
      const player = world.players[0];
      player.scene = ["countdown", "active", "dead", "ended"].includes(state)
        ? "forest"
        : undefined;
      player.x = player.scene ? 2400 : state === "training" ? 140 : 480;
      player.y = player.scene ? 1280 : 340;
      player.hitpoints = state === "dead" ? 0 : 100;
      world.scene!.phase =
        state === "countdown" ? "countdown" : state === "ended" ? "ended" : "active";
      // Retain a recent attack when leaving combat to catch stale weapon/attack rendering.
      player.attackAt = world.serverNow;
      sendState();
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        const capture = (
          window as unknown as { weaponCapture: { weapons: number; players: number } }
        ).weaponCapture;
        capture.weapons = capture.players = 0;
      });
      await page.waitForTimeout(150);
      const capture = await page.evaluate(
        () =>
          (window as unknown as { weaponCapture: { weapons: number; players: number } })
            .weaponCapture,
      );
      expect(capture.players, `${classId} ${state}: player rendered`).toBeGreaterThan(0);
      expect(capture.weapons > 0, `${classId} ${state}: weapon visibility`).toBe(
        state === "training" || state === "active",
      );
    }
  }
  await page.screenshot({ path: "test-results/village-sheathed-weapons.png" });
});
