import { test, expect } from "@playwright/test";
import { nearbyInteraction, inTrainingZone } from "../packages/common/src/index";
import type { WorldState } from "../packages/common/src/index";

for (const className of ["Ranger", "Druid"]) {
  test(`${className} damages lobby targets and feeds DPS without harming the player`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    let current: WorldState | undefined;
    page.on("websocket", (socket) =>
      socket.on("framereceived", ({ payload }) => {
        const message = JSON.parse(String(payload));
        if (message.type === "joined" || message.type === "state") current = message.world;
      }),
    );
    await page.goto("/");
    await page.getByRole("tab", { name: "Create a world" }).click();
    await page.getByRole("button", { name: "Light the ember" }).click();
    await expect.poll(() => current?.training?.enemies.length).toBe(7);
    const positions = current!.training!.enemies.map(({ x, y }) => ({ x, y }));
    await page.locator("canvas").click();
    await page.keyboard.down("a");
    await expect
      .poll(() => current?.players[0] && nearbyInteraction(current.players[0])?.id)
      .toBe("wardrobe");
    await page.keyboard.up("a");
    await page.keyboard.press("e");
    await page
      .getByRole("dialog", { name: "Wardrobe" })
      .getByRole("button", { name: new RegExp(`^${className}`) })
      .click();
    await page.keyboard.press("Escape");
    await expect.poll(() => current?.players[0].attackAt).toBeUndefined();
    await expect(page.getByLabel("Damage per second", { exact: true })).toContainText("0 DPS");
    const tap = async (key: string) => {
      await page.evaluate(async (key) => {
        const code = `Key${key.toUpperCase()}`;
        window.dispatchEvent(new KeyboardEvent("keydown", { code }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        window.dispatchEvent(new KeyboardEvent("keyup", { code }));
      }, key);
      await page.waitForTimeout(1000);
    };
    for (let step = 0; step < 4 && current!.players[0].x < 410; step++) await tap("d");
    for (let step = 0; step < 8 && current!.players[0].y > 300; step++) await tap("w");
    for (let step = 0; step < 12 && !inTrainingZone(current!.players[0]); step++) await tap("a");
    expect(
      inTrainingZone(current!.players[0]),
      JSON.stringify({ x: current!.players[0].x, y: current!.players[0].y }),
    ).toBe(true);
    await expect.poll(() => current?.players[0].dps).toBeGreaterThan(0);
    if (className === "Druid") {
      await expect
        .poll(() => {
          const bear = current?.players[0].bear;
          const dummy = current?.training?.enemies[0];
          return bear && dummy ? Math.hypot(bear.x - dummy.x, bear.y - dummy.y) : Infinity;
        })
        .toBeCloseTo(80, 5);
      await expect.poll(() => current?.training?.damage.some((hit) => hit.amount === 2)).toBe(true);
    }
    await expect(
      page.getByLabel("Damage per second", { exact: true }).locator("strong"),
    ).not.toHaveText("0 DPS");
    expect(current!.players[0].hitpoints).toBe(current!.players[0].maxHitpoints);
    expect(current!.training!.enemies.map(({ x, y }) => ({ x, y }))).toEqual(positions);
    await page.screenshot({ path: `test-results/training-${className.toLowerCase()}-dps.png` });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("FPS graph", { exact: true }).uncheck();
    await page.getByLabel("Latency graph", { exact: true }).uncheck();
    await page.getByRole("button", { name: /^Close / }).click();
    const dps = await page.getByLabel("Damage per second", { exact: true }).boundingBox();
    const party = await page.locator(".party").boundingBox();
    expect(dps!.y).toBe(14);
    expect(party!.y).toBeGreaterThanOrEqual(dps!.y + dps!.height);
  });
}
