import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { GRAPHICS_PRESETS } from "../packages/client/src/graphics";

const source = readFileSync("packages/client/src/forest.ts", "utf8");
const renderer = stripTypeScriptTypes(
  source.slice(source.indexOf("const portalSilhouette"), source.indexOf("const fogTexture")),
).replace("export function", "function");
const lighting = stripTypeScriptTypes(
  readFileSync("packages/client/src/lighting.ts", "utf8"),
).replaceAll("export ", "");
const effectsSource = readFileSync("packages/client/src/effects.ts", "utf8");
const vegetation = stripTypeScriptTypes(
  effectsSource.slice(
    effectsSource.indexOf("export function vegetationSway"),
    effectsSource.indexOf("export function obstacleOpacity"),
  ),
).replaceAll("export ", "");

test("portals share tree sway, keep their base fixed, and honor the waving toggle", async ({
  page,
}) => {
  await page.setContent('<canvas width="360" height="180"></canvas>');
  await page.addScriptTag({
    content: `function drawNameBadge() {}\n${vegetation}\n${lighting}\n${renderer}`,
  });
  const samples = await page.evaluate(() => {
    const ctx = document.querySelector("canvas")!.getContext("2d")!;
    const draw = Reflect.get(window, "drawPortal");
    const drawTree = Reflect.get(window, "drawVegetation");
    const tree = document.createElement("canvas");
    tree.width = tree.height = 32;
    const samples: { portal: number; tree: number; root: number; restored: boolean }[] = [];
    let portalSway = 0,
      root = 0,
      treeSway = 0;
    const ellipse = ctx.ellipse.bind(ctx);
    ctx.ellipse = (...args) => {
      if (args[2] === 25 && args[3] === 38) {
        const matrix = ctx.getTransform();
        portalSway = matrix.c;
        root = matrix.c * 8 + matrix.e;
      }
      ellipse(...args);
    };
    ctx.drawImage = () => {
      treeSway = ctx.getTransform().c;
    };
    for (const [time, waving] of [
      [0, true],
      [1600, true],
      [1600, false],
    ] as const) {
      draw(ctx, 180, 120, time, false, "", false, false, waving);
      drawTree(ctx, tree, 180, 128, 50, 76, time, waving);
      samples.push({
        portal: portalSway,
        tree: treeSway,
        root,
        restored: ctx.getTransform().isIdentity,
      });
    }
    return samples;
  });
  expect(samples[0].portal).not.toBe(samples[1].portal);
  expect(samples[2].portal).toBe(0);
  for (const sample of samples) {
    expect(sample.portal).toBeCloseTo(sample.tree, 10);
    expect(sample.root).toBeCloseTo(180, 10);
    expect(sample.restored).toBe(true);
  }
});

test("blue portal ripples animate, stay inside the oval, and render without bloom", async ({
  page,
}) => {
  await page.setContent('<canvas width="360" height="180"></canvas>');
  await page.addScriptTag({ content: `function drawNameBadge() {}\n${lighting}\n${renderer}` });
  const frames = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    const draw = Reflect.get(window, "drawPortal");
    const interiors: number[][] = [];
    for (const [x, time, bloom] of [
      [60, 0, false],
      [180, 1600, false],
      [300, 1600, true],
    ] as const) {
      draw(ctx, x, 120, time, Boolean(bloom), "", false, false, false);
      interiors.push(Array.from(ctx.getImageData(x - 15, 65, 30, 40).data));
    }
    return {
      interiors,
      outside: Array.from(ctx.getImageData(37, 53, 1, 1).data),
      restored: ctx.globalAlpha === 1 && ctx.shadowBlur === 0 && ctx.getTransform().isIdentity,
    };
  });
  expect(frames.interiors[0]).not.toEqual(frames.interiors[1]);
  for (const pixels of frames.interiors) {
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i + 2]).toBeGreaterThan(pixels[i]);
      expect(pixels[i + 3]).toBe(255);
    }
  }
  expect(frames.outside).toEqual([0, 0, 0, 0]);
  expect(frames.restored).toBe(true);
  await page.locator("canvas").screenshot({ path: "test-results/blue-portal-phases.png" });
});

test("portal shadows follow Low, Balanced and High presets and the shadow toggle", async ({
  page,
}) => {
  await page.setContent('<canvas width="480" height="200"></canvas>');
  await page.addScriptTag({ content: `function drawNameBadge() {}\n${lighting}\n${renderer}` });
  const samples = await page.evaluate((presets) => {
    const canvas = document.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    const draw = Reflect.get(window, "drawPortal");
    const samples = Object.values(presets).map((quality, i) => {
      const x = 70 + i * 160;
      draw(ctx, x, 100, 1600, quality.bloom, "", false, quality.shadows, false);
      const shadow = Array.from(ctx.getImageData(x + 30, 138, 1, 1).data);
      const contact = Array.from(ctx.getImageData(x - 28, 101, 1, 1).data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, x, 100, 1600, quality.bloom, "", false, false, false);
      const disabled = Array.from(ctx.getImageData(x + 30, 138, 1, 1).data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return {
        shadow,
        contact,
        disabled,
        restored: ctx.globalAlpha === 1 && ctx.getTransform().isIdentity,
      };
    });
    Object.values(presets).forEach((quality, i) =>
      draw(ctx, 70 + i * 160, 100, 1600, quality.bloom, "", false, quality.shadows, false),
    );
    return samples;
  }, GRAPHICS_PRESETS);
  expect(samples[0].shadow).toEqual([0, 0, 0, 0]);
  expect(samples[0].contact[3]).toBe(255);
  for (const sample of samples.slice(1)) {
    expect(sample.shadow[3]).toBeGreaterThan(sample.disabled[3] + 50);
    expect(sample.contact[3]).toBeLessThan(255);
  }
  expect(samples.every((sample) => sample.restored)).toBe(true);
  await page.locator("canvas").screenshot({ path: "test-results/portal-quality-shadows.png" });
});

test("village and return portals sort players by their feet, including forest wrapping", async ({
  page,
}) => {
  const { LOBBY_PORTAL, FOREST } = await import("../packages/common/src/index");
  const world = {
    id: "depth-fixture",
    name: "Village",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "Depth visitor",
        x: LOBBY_PORTAL.x,
        y: LOBBY_PORTAL.y - 30,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
        attackAt: 0,
      },
    ],
  } satisfies import("../packages/common/src/index").WorldState;
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
    const lastPlayer = new WeakMap<CanvasRenderingContext2D, boolean>();
    const prototype = CanvasRenderingContext2D.prototype;
    const transform = prototype.setTransform;
    prototype.setTransform = new Proxy(transform, {
      apply(target, context, args) {
        if (context.canvas.getAttribute("aria-label")) lastPlayer.set(context, false);
        return Reflect.apply(target, context, args);
      },
    });
    prototype.drawImage = new Proxy(prototype.drawImage, {
      apply(target, context, args) {
        if (
          context.canvas.getAttribute("aria-label") &&
          args[0] instanceof HTMLImageElement &&
          args[0].src.endsWith("/knight.png")
        ) {
          document.body.dataset.portalInFront = String(!lastPlayer.get(context));
        }
        return Reflect.apply(target, context, args);
      },
    });
    const text = prototype.fillText;
    prototype.fillText = function (value, x, y) {
      if (this.canvas.getAttribute("aria-label")) {
        if (value.endsWith("portal") || value.endsWith("Return to village"))
          lastPlayer.set(this, true);
        if (value === "Depth visitor")
          document.body.dataset.playerInFront = String(lastPlayer.get(this));
      }
      text.call(this, value, x, y);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  for (const [scene, portal] of [
    [undefined, LOBBY_PORTAL],
    ["forest", { x: 2400, y: 1280 }],
    ["forest", { x: 2400, y: 5 }],
  ] as const) {
    Object.assign(world, {
      scene: scene
        ? {
            id: "depth-forest",
            type: "Forest",
            difficulty: "Easy",
            phase: "ended",
            ready: [],
            countdownAt: null,
            endsAt: null,
            enemies: [],
            damage: [],
            portals: [portal],
            sequence: 0,
            nextSpawn: 0,
          }
        : undefined,
    });
    for (const [offset, inFront] of [
      [-30, false],
      [0, true],
      [-30, false],
    ] as const) {
      Object.assign(world.players[0], {
        scene,
        x: portal.x,
        y: (portal.y + offset + FOREST.height) % FOREST.height,
      });
      world.serverNow += 50;
      update();
      await expect(page.locator("body")).toHaveAttribute("data-player-in-front", String(inFront));
      await expect(page.locator("body")).toHaveAttribute("data-portal-in-front", String(!inFront));
      await page.screenshot({
        path: `test-results/portal-depth-${scene ?? "village"}-${portal.y}-${offset}.png`,
      });
    }
  }
});
