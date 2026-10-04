import { test, expect } from "./fixtures";
import { writeFileSync } from "node:fs";
import {
  TRAINING_ZONES,
  LOBBY_PORTAL,
  starterEquipment,
} from "../packages/common-new/src/index.ts";

test.use({ graphicsPreset: "High" });
test.use({
  launchOptions: {
    args: [
      ...(process.platform === "win32" ? ["--use-angle=d3d11"] : []),
      "--disable-frame-rate-limit",
    ],
  },
});

test("profile village, training and forest frame budgets", async ({
  page,
  browser,
  game,
}, testInfo) => {
  test.skip(
    !process.env.PERF_NEW,
    "Opt-in hardware measurement; not an FPS assertion on CI/software GPUs.",
  );
  const profileCpu = !!process.env.PROFILE_NEW;
  const system = await browser.newBrowserCDPSession();
  const { gpu } = await system.send("SystemInfo.getInfo");
  await system.detach();
  await page.goto("/");
  const build = await (await page.request.get("/version.json")).json();
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const session = await page.context().newCDPSession(page);
  await session.send("Profiler.enable");
  for (const scene of ["village", "training", "forest", "crowded"] as const) {
    if (scene === "training") {
      player.classId = "mage";
      player.equipment = starterEquipment("mage");
      player.x = TRAINING_ZONES[0].x - 120;
      player.y = TRAINING_ZONES[0].y;
    }
    if (scene === "forest") {
      player.x = LOBBY_PORTAL.x;
      player.y = LOBBY_PORTAL.y - 15;
      const portal = page.getByRole("dialog", { name: "Forest portal" });
      await expect(async () => {
        await page.keyboard.press("e");
        await expect(portal).toBeVisible();
      }).toPass({ intervals: [200], timeout: 6000 });
      await portal.getByRole("button", { name: "Create", exact: true }).click();
      await portal.getByRole("button", { name: "I'm ready" }).click();
      await expect(page.getByLabel("Forest combat scene.")).toBeVisible({ timeout: 10000 });
      await page.keyboard.down("d");
    }
    if (scene === "crowded") {
      const forest = world.scene!;
      player.x = 2400;
      player.y = 1280;
      player.hitpoints = player.maxHitpoints = 100000;
      player.hurtAt = Date.now() + 60000;
      forest.endsAt = Date.now() + 600000;
      forest.enemies = Array.from({ length: 80 }, (_, i) => ({
        id: ++forest.sequence,
        x: player.x + Math.cos(i * 2.4) * (80 + i * 3),
        y: player.y + Math.sin(i * 2.4) * (80 + i * 3),
        angle: 0,
        hitpoints: 100000,
        maxHitpoints: 100000,
        kind: "normal" as const,
        archetype: (["skeleton", "runner", "brute", "caster"] as const)[i % 4],
      }));
    }
    await page.waitForTimeout(3000);
    if (profileCpu) await session.send("Profiler.start");
    const timing = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples: number[] = [];
          let previous = 0;
          const frame = (now: number) => {
            if (previous) samples.push(now - previous);
            previous = now;
            if (samples.length < 1200) requestAnimationFrame(frame);
            else {
              samples.sort((a, b) => a - b);
              resolve({
                mean: samples.reduce((a, b) => a + b) / samples.length,
                p50: samples[600],
                p95: samples[1140],
                p99: samples[1188],
                max: samples[1199],
                over240Budget: samples.filter((ms) => ms > 1000 / 240).length,
                frames: samples.length,
              });
            }
          };
          requestAnimationFrame(frame);
        }),
    );
    if (profileCpu) {
      const { profile } = await session.send("Profiler.stop");
      writeFileSync(testInfo.outputPath(`${scene}.cpuprofile`), JSON.stringify(profile));
    }
    await page.keyboard.up("d");
    const stats = await page.locator("canvas").getAttribute("data-render-stats");
    const measurement = {
      scene,
      build,
      browser: browser.version(),
      gpu,
      viewport: page.viewportSize(),
      preset: "High",
      warmupMs: 3000,
      profileCpu,
      timing,
      stats,
    };
    writeFileSync(testInfo.outputPath(`${scene}.json`), JSON.stringify(measurement, null, 2));
    console.log(JSON.stringify({ scene, timing, stats, gpu: gpu.devices }));
    await page.screenshot({ path: testInfo.outputPath(`${scene}.png`) });
  }
  await session.detach();
});
