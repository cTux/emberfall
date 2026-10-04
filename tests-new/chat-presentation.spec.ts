import { test, expect } from "./fixtures";
import { LOBBY_PORTAL } from "../packages/common-new/src/index.ts";

// Exercise fresh defaults and saved preferences without the fixture's preset override.
test.use({ graphicsPreset: null });

test("fog is opt-in and player messages sit above health in village and forest", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  const fog = page.getByLabel("Volumetric fog (2D)", { exact: true });
  await expect(fog).not.toBeChecked();
  for (const preset of ["Low", "Balanced", "High"]) {
    await page.getByRole("button", { name: preset, exact: true }).click();
    await expect(fog).not.toBeChecked();
  }
  await fog.check();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await expect(fog).toBeChecked();
  await fog.uncheck();
  await page.getByRole("button", { name: "Close Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const send = async (text: string) => {
    await page.getByRole("complementary", { name: "World chat", exact: true }).hover();
    await page.getByLabel("Chat message", { exact: true }).fill(text);
    await page.keyboard.press("Enter");
    await expect.poll(() => player.chat).toBe(text);
    await expect(page.getByRole("log")).toContainText(text);
    await page.keyboard.press("Escape");
    await page.mouse.move(700, 400);
    // Allow the confirmed snapshot and subsequent render to reach the canvas.
    await page.waitForTimeout(300);
  };
  await send("hello");
  await page.screenshot({ path: "test-results/new-chat-village.png" });
  await page.setViewportSize({ width: 800, height: 600 });
  await send("A long player message that wraps across multiple lines right above the health bar.");
  await page.screenshot({ path: "test-results/new-chat-village-wrapped.png" });
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
  await send("hello forest");
  await page.screenshot({ path: "test-results/new-chat-forest.png" });
  expect(errors).toEqual([]);
});
