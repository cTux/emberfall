import { test, expect } from "@playwright/test";
import { CLASS_IDS, tickTraining } from "../packages/common/src/index";
import type { WorldState } from "../packages/common/src/index";

test("all classes sheath weapons outside combat and draw them in forest and training", async ({
  page,
}) => {
  test.setTimeout(60000);
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
    const capture = {
      weapons: 0,
      players: 0,
      bowAngle: 0,
      playerTops: {} as Record<number, number>,
      weaponX: 0,
      weaponTop: 0,
      weaponScaleX: 0,
      weaponScaleY: 0,
    };
    (window as unknown as { weaponCapture: typeof capture }).weaponCapture = capture;
    const prototype = CanvasRenderingContext2D.prototype;
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLImageElement) {
          if (args[0].src.includes("/assets/weapons/")) {
            capture.weapons++;
            const transform = (context as CanvasRenderingContext2D).getTransform();
            capture.weaponX = transform.transformPoint({ x: args[1] + 16, y: args[2] + 16 }).x;
            capture.weaponTop = Math.min(
              transform.transformPoint({ x: args[1], y: args[2] }).y,
              transform.transformPoint({ x: args[1] + 32, y: args[2] + 32 }).y,
            );
            capture.weaponScaleX = transform.a;
            capture.weaponScaleY = transform.d;
          }
          if (args[0].src.endsWith("/assets/weapons/ranger.png")) {
            const transform = (context as CanvasRenderingContext2D).getTransform();
            // The bow's outward direction in the source image is down-left (135 degrees).
            capture.bowAngle = Math.atan2(transform.b, transform.a) + (3 * Math.PI) / 4;
          }
          if (
            /\/assets\/(knight|warrior-attack|ranger|ranger-attack|mage|mage-attack|druid|druid-attack)\.png$/.test(
              args[0].src,
            )
          ) {
            capture.players++;
            const transform = (context as CanvasRenderingContext2D).getTransform();
            const top = transform.transformPoint({ x: args[5] + 24, y: args[6] });
            capture.playerTops[top.x] = top.y;
          }
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
  // Remote movement keeps automatic local aiming/input from replacing the supplied direction.
  const traveler = { ...world.players[0], id: "traveler", x: 420 };
  world.players.push(traveler);
  for (const classId of CLASS_IDS) {
    traveler.classId = classId;
    for (const [inputX, inputY] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      traveler.inputX = inputX;
      traveler.inputY = inputY;
      sendState();
      await page.waitForTimeout(150);
      // Remote walking uses displacement between timestamped snapshots, not just input intent.
      traveler.x += inputX * 12;
      traveler.y += inputY * 12;
      world.serverNow! += 100;
      sendState();
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        (window as unknown as { weaponCapture: { weapons: number } }).weaponCapture.weapons = 0;
      });
      await page.waitForTimeout(150);
      const capture = await page.evaluate(
        () =>
          (
            window as unknown as {
              weaponCapture: { weapons: number; weaponScaleX: number; weaponScaleY: number };
            }
          ).weaponCapture,
      );
      expect(capture.weapons > 0, `${classId} village direction ${inputX},${inputY}`).toBe(
        inputY === -1,
      );
      if (inputY === -1) {
        expect(
          capture.weaponScaleX,
          `${classId}: horizontal direction is preserved`,
        ).toBeGreaterThan(0);
        expect(capture.weaponScaleY, `${classId}: sheathed weapon is mirrored vertically`).toBe(
          -capture.weaponScaleX,
        );
        const offset = await page.evaluate(() => {
          const capture = (
            window as unknown as {
              weaponCapture: {
                playerTops: Record<number, number>;
                weaponX: number;
                weaponTop: number;
                weaponScaleX: number;
              };
            }
          ).weaponCapture;
          return (capture.weaponTop - capture.playerTops[capture.weaponX]) / capture.weaponScaleX;
        });
        expect(offset, `${classId}: sheathed weapon sits below the head`).toBeCloseTo(22, 5);
        await page.screenshot({ path: `test-results/back-weapon-${classId}.png` });
      }
    }
  }
  world.players.pop();
  // Use a remote ranger so local automatic aiming cannot replace the supplied angle.
  world.players[0].classId = "warrior";
  const ranger = { ...world.players[0], id: "ranger", classId: "ranger" as const };
  world.players.push(ranger);
  for (const scene of [undefined, "forest"] as const) {
    ranger.scene = world.players[0].scene = scene;
    ranger.x = world.players[0].x = scene ? 2400 : 140;
    ranger.y = world.players[0].y = scene ? 1280 : 340;
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      ranger.attackAngle = angle;
      sendState();
      await expect
        .poll(async () => {
          const bowAngle = await page.evaluate(
            () =>
              (window as unknown as { weaponCapture: { bowAngle: number } }).weaponCapture.bowAngle,
          );
          return Math.atan2(Math.sin(bowAngle - angle), Math.cos(bowAngle - angle));
        })
        .toBeCloseTo(0, 5);
    }
    await page.screenshot({ path: `test-results/bow-aim-${scene ?? "training"}.png` });
  }
});
