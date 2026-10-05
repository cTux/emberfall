import { test, expect } from "./fixtures";
import type { WorldState } from "../packages/common/src/index";

test("warnings, enemy silhouettes, graphics controls and scene music work together", async ({
  page,
}) => {
  const world: WorldState = {
    id: "fixture",
    name: "Combat fixture",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Hunter",
        x: 2400,
        y: 1280,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
        scene: "forest",
        attackAt: 10000,
      },
    ],
    scene: {
      id: "run",
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: 120000,
      nextSpawn: 1e9,
      sequence: 10,
      portals: [],
      damage: [
        { id: 90, x: 2400, y: 1280, amount: 10, at: 9850, target: "p" },
        { id: 91, x: 2250, y: 1240, amount: 5, at: 9850, target: "enemy:1" },
      ],
      drops: [
        { id: 92, kind: "experience", x: 2360, y: 1320, at: 9500 },
        { id: 93, kind: "gold", x: 2390, y: 1320, at: 9500 },
      ],
      enemies: [
        { id: 1, archetype: "runner", x: 2250, y: 1240, hitpoints: 10, angle: 0 },
        {
          id: 2,
          archetype: "brute",
          kind: "elite",
          x: 2550,
          y: 1280,
          hitpoints: 50,
          angle: 0,
          attack: { startedAt: 9500, endsAt: 10500, x: 2550, y: 1280, radius: 65, ranged: false },
        },
        {
          id: 3,
          archetype: "caster",
          x: 2300,
          y: 1420,
          hitpoints: 10,
          angle: 0,
          attack: { startedAt: 9500, endsAt: 10500, x: 2400, y: 1380, radius: 22, ranged: true },
        },
      ],
      spawns: [
        { id: 4, x: 2430, y: 1120, hitpoints: 10, angle: 0, warnedAt: 9500, spawnsAt: 11000 },
      ],
      projectiles: [{ id: 5, x: 2450, y: 1380, vx: -210, vy: 0, expiresAt: 14000 }],
    },
  };
  await page.routeWebSocket("**/ws", (socket) => {
    socket.send(
      JSON.stringify({
        type: "worlds",
        worlds: [{ id: "fixture", name: "Playtest Default", players: 0, capacity: 32 }],
      }),
    );
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "join")
        socket.send(
          JSON.stringify({ type: "joined", playerId: "p", world, characterToken: "a".repeat(64) }),
        );
      if (message.type === "move") {
        world.players[0].inputSeq = message.seq;
        socket.send(JSON.stringify({ type: "state", world }));
      }
      if (message.type === "leaveScene") {
        world.players[0].scene = undefined;
        world.players[0].x = 420;
        world.players[0].y = 340;
        socket.send(JSON.stringify({ type: "state", world }));
      }
    });
  });
  await page.addInitScript(() => {
    const audio: HTMLAudioElement[] = [];
    const capture = {
      audio,
      sprites: {} as Record<string, number>,
      redFills: 0,
      bloodParticles: 0,
      lootSprites: 0,
      swordParticles: 0,
      greenRadius: 0,
      greenAngle: 0,
      greenAngles: [] as number[],
      frames: [] as number[],
    };
    (window as unknown as { combatCapture: typeof capture }).combatCapture = capture;
    window.Audio = new Proxy(window.Audio, {
      construct(target, args) {
        const element = Reflect.construct(target, args);
        audio.push(element);
        return element;
      },
    });
    const prototype = CanvasRenderingContext2D.prototype;
    prototype.fillRect = new Proxy(prototype.fillRect, {
      apply(target, context, args) {
        if (["#bd283b", "#f45561"].includes(context.fillStyle)) capture.bloodParticles++;
        if (context.fillStyle === "#a8ffce") capture.swordParticles++;
        return Reflect.apply(target, context, args);
      },
    });
    prototype.arc = new Proxy(prototype.arc, {
      apply(target, context, args) {
        if (context.strokeStyle === "#52ed87") {
          capture.greenRadius = args[2];
          capture.greenAngle = args[3] + Math.PI / 2;
          capture.greenAngles.push(capture.greenAngle);
          if (capture.greenAngles.length > 300) capture.greenAngles.shift();
        }
        return Reflect.apply(target, context, args);
      },
    });
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLCanvasElement && args[0].width === 40 && args[0].height === 40)
          capture.lootSprites++;
        if (
          args[0] instanceof HTMLImageElement &&
          /\/(runner|brute|caster)\.png$/.test(args[0].src)
        )
          capture.sprites[args[0].src.split("/").at(-1)!] = args[7];
        return Reflect.apply(target, context, args);
      },
    });
    prototype.fill = new Proxy(prototype.fill, {
      apply(target, context, args) {
        if (
          String(context.fillStyle).includes("255") ||
          String(context.fillStyle).startsWith("#ff")
        )
          capture.redFills++;
        return Reflect.apply(target, context, args);
      },
    });
    prototype.fillText = new Proxy(prototype.fillText, {
      apply(target, context, args) {
        if (args[0] === "Hunter" && context.font === '8px "Alegreya Sans", sans-serif')
          capture.frames.push(performance.now());
        return Reflect.apply(target, context, args);
      },
    });
  });
  const playing = (track: string) =>
    page.evaluate(
      (name) =>
        (
          window as unknown as { combatCapture: { audio: HTMLAudioElement[] } }
        ).combatCapture.audio.some(
          (a) => a.src.endsWith(name) && !a.paused && a.currentTime > 0.1 && a.volume > 0,
        ),
      track,
    );
  const finishTrack = async (name: string) => {
    await page.evaluate((name) => {
      const audio = (
        window as unknown as { combatCapture: { audio: HTMLAudioElement[] } }
      ).combatCapture.audio.find((a) => a.src.endsWith(name) && !a.paused)!;
      // Simulate the native end event without waiting several minutes per track.
      audio.pause();
      audio.dispatchEvent(new Event("ended"));
    }, name);
  };
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect.poll(() => playing("Intro.mp3")).toBe(true);
  await finishTrack("Intro.mp3");
  await expect.poll(() => playing("Theme_001.mp3")).toBe(true);
  await finishTrack("Theme_001.mp3");
  await expect.poll(() => playing("Intro.mp3")).toBe(true);
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  for (const label of ["Adaptive resolution", "Sunlight shafts (2D)", "Cinematic color grading"])
    await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("combobox", { name: "Frame rate limit" }).click();
  await page.getByRole("option", { name: "60 FPS", exact: true }).click();
  await page.getByRole("button", { name: /^Close / }).click();
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect.poll(() => playing("Trials.mp3")).toBe(true);
  await finishTrack("Trials.mp3");
  await expect.poll(() => playing("Wastelands.mp3")).toBe(true);
  await finishTrack("Wastelands.mp3");
  await expect.poll(() => playing("Trials.mp3")).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { combatCapture: { sprites: Record<string, number> } })
            .combatCapture.sprites,
      ),
    )
    .toEqual({ "runner.png": 32, "brute.png": 68, "caster.png": 44 });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { combatCapture: { redFills: number } }).combatCapture.redFills,
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { combatCapture: { greenRadius: number } }).combatCapture
            .greenRadius,
      ),
    )
    .toBe(88);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = (
          window as unknown as {
            combatCapture: { bloodParticles: number; lootSprites: number; swordParticles: number };
          }
        ).combatCapture;
        return c.bloodParticles > 0 && c.lootSprites > 0 && c.swordParticles > 0;
      }),
    )
    .toBe(true);
  await page.screenshot({ path: "test-results/combat-warnings.png" });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { combatCapture: { audio: HTMLAudioElement[] } }
        ).combatCapture.audio.some((a) => a.src.endsWith("slash.wav") && a.currentTime > 0),
      ),
    )
    .toBe(true);
  await page.evaluate(() => {
    (window as unknown as { combatCapture: { greenAngles: number[] } }).combatCapture.greenAngles =
      [];
  });
  world.scene!.enemies[0].x = 2340;
  world.scene!.enemies[0].y = 1280;
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { combatCapture: { greenAngle: number } }).combatCapture.greenAngle,
      ),
    )
    .toBeCloseTo(Math.PI);
  const turn = await page.evaluate(
    () =>
      (window as unknown as { combatCapture: { greenAngles: number[] } }).combatCapture.greenAngles,
  );
  expect(turn.some((angle) => angle > 0.1 && angle < Math.PI - 0.1)).toBe(true);
  world.scene!.spawns = [];
  world.scene!.projectiles = [];
  world.players[0].attackAt = 1e9;
  world.scene!.enemies = Array.from({ length: 160 }, (_, i) => ({
    id: i + 20,
    archetype: (["skeleton", "runner", "brute", "caster"] as const)[i % 4],
    x: 2000 + (i % 20) * 40,
    y: 1100 + Math.floor(i / 20) * 40,
    hitpoints: 10,
    angle: 0,
    cooldownUntil: 1e9,
  }));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    (window as unknown as { combatCapture: { frames: number[] } }).combatCapture.frames = [];
  });
  await page.waitForTimeout(2000);
  const frames = await page.evaluate(
    () => (window as unknown as { combatCapture: { frames: number[] } }).combatCapture.frames,
  );
  expect(frames.length).toBeGreaterThan(20);
  const durations = frames
    .slice(1)
    .map((t, i) => t - frames[i])
    .sort((a, b) => a - b);
  await test.info().attach("dense-combat-frame-times.json", {
    body: JSON.stringify({
      enemies: 160,
      samples: durations.length,
      medianMs: durations[Math.floor(durations.length / 2)],
      p95Ms: durations[Math.floor(durations.length * 0.95)],
    }),
    contentType: "application/json",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect.poll(() => playing("In_The_Woods.mp3")).toBe(true);
  await finishTrack("In_The_Woods.mp3");
  await expect.poll(() => playing("Adventure.mp3")).toBe(true);
  await finishTrack("Adventure.mp3");
  await expect.poll(() => playing("In_The_Woods.mp3")).toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Sound", exact: true }).click();
  await page.getByLabel("Music", { exact: true }).uncheck();
  await expect.poll(() => playing("In_The_Woods.mp3")).toBe(false);
  const response = await page.request.get("/audio/Trials.mp3");
  expect(response.headers()["content-type"]).toBe("audio/mpeg");
  expect((await response.body()).length).toBeGreaterThan(100000);
});
