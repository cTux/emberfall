import { test, expect } from "./fixtures";
import type { SceneState } from "../packages/common/src/scene.ts";

test("portal creates server scene; two players vote, retract, fight and individually return", async ({
  page,
  browser,
}) => {
  test.setTimeout(45000);
  const errors: string[] = [];
  let position: { x: number; y: number } | undefined;
  let scene: SceneState | undefined;
  page.on("websocket", (ws) => {
    ws.on("framereceived", ({ payload }) => {
      const m = JSON.parse(String(payload));
      if (m.type === "state") {
        position = m.world.players[0];
        scene = m.world.scene;
      }
    });
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByLabel("Forest preview")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("user-select", "none");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto("/");
  await guest.getByRole("button", { name: /Playtest Default/ }).click();
  await expect(page.getByRole("complementary", { name: /2\/32/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toContainText("leave the lobby");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.keyboard.down("d");
  await page.waitForTimeout(450);
  await page.keyboard.up("d");
  await page.keyboard.down("d");
  await page.waitForTimeout(270);
  await page.keyboard.up("d");
  await page.screenshot({ path: "test-results/portal-layering.png" });
  await page.keyboard.press("e");
  const dialog = page.getByRole("dialog", { name: "Forest portal" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Scene type" })).toHaveText("Forest");
  await expect(page.getByRole("combobox", { name: "Difficulty" })).toHaveText("Easy");
  const before = await dialog.boundingBox();
  const title = await dialog.locator("h2").boundingBox();
  await page.mouse.move(title!.x + 35, title!.y + 15);
  await page.mouse.down();
  await page.mouse.move(title!.x + 135, title!.y + 65, { steps: 6 });
  await page.mouse.up();
  const after = await dialog.boundingBox();
  expect(after!.x - before!.x).toBeCloseTo(100, 0);
  await page.screenshot({ path: "test-results/portal-dialog.png" });
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toContainText("Vote here when you are ready");
  await page.screenshot({ path: "test-results/portal-vote.png" });
  await expect(
    guest
      .getByRole("dialog", { name: "Forest portal" })
      .getByRole("region", { name: "Departure vote" }),
  ).toContainText("0/2 ready");
  await dialog.getByRole("button", { name: "I'm ready" }).click();
  await expect(dialog).toBeHidden();
  await guest.getByRole("button", { name: "I'm ready" }).click();
  await expect(guest.getByRole("dialog", { name: "Forest portal" })).toBeHidden();
  await expect(page.getByRole("status", { name: /Departing in/ })).toBeVisible();
  await expect(page.locator(".departure-countdown span")).toHaveCSS(
    "animation-name",
    "departure-pulse",
  );
  await page.screenshot({ path: "test-results/departure-countdown.png" });
  await guest.getByRole("button", { name: "Portal vote" }).click();
  await guest.getByRole("button", { name: "Retract ready vote" }).click();
  await expect(page.getByRole("status", { name: /Departing in/ })).not.toBeVisible();
  await page.waitForTimeout(5200);
  await expect(page.getByLabel("Shared village. Move with WASD or arrow keys.")).toBeVisible();
  await guest.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByLabel("Forest combat scene.")).toBeVisible({ timeout: 8000 });
  await expect(guest.getByLabel("Forest combat scene.")).toBeVisible();
  const lateContext = await browser.newContext();
  const late = await lateContext.newPage();
  await late.goto("/");
  await late.getByRole("button", { name: /Playtest Default/ }).click();
  await expect(late.getByLabel("Shared village. Move with WASD or arrow keys.")).toBeVisible();
  await expect(late.locator('.party article[aria-label$="in another dimension"]')).toHaveCount(2);
  await expect(
    late.locator('.party article[aria-label$="in another dimension"]').first(),
  ).toHaveCSS("opacity", "0.4");
  await late.keyboard.down("d");
  await late.waitForTimeout(350);
  await late.keyboard.up("d");
  await late.waitForTimeout(150);
  await late.keyboard.press("e");
  await late.getByRole("button", { name: "Join scene", exact: true }).click();
  await expect(late.getByLabel("Forest combat scene.")).toBeVisible();
  await expect(late.locator('.party article[aria-label$="in another dimension"]')).toHaveCount(0);
  await lateContext.close();
  await page.bringToFront();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "test-results/forest-combat.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toContainText("leave the current game");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByLabel("Shared village. Move with WASD or arrow keys.")).toBeVisible();
  await expect(guest.getByLabel("Forest combat scene.")).toBeVisible();
  await expect(page.locator('.party article[aria-label$="in another dimension"]')).toHaveCount(1);
  await expect(guest.locator('.party article[aria-label$="in another dimension"]')).toHaveCount(1);
  await expect(page.locator('.party article:not([aria-label$="in another dimension"])')).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByLabel("Shared village. Move with WASD or arrow keys.").click();
  await page.keyboard.down("d");
  await page.waitForTimeout(390);
  await page.keyboard.up("d");
  await page.waitForTimeout(150);
  await expect.poll(() => position?.x ?? 0).toBeGreaterThan(500);
  await page.waitForTimeout(150);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "Join scene", exact: true }).click();
  await expect(page.getByLabel("Forest combat scene.")).toBeVisible();
  await expect(page.locator('.party article[aria-label$="in another dimension"]')).toHaveCount(0);
  for (const participant of [page, guest]) {
    await participant.keyboard.press("Escape");
    await participant.getByRole("button", { name: "Leave", exact: true }).click();
    await expect(
      participant.getByLabel("Shared village. Move with WASD or arrow keys."),
    ).toBeVisible();
  }
  await expect.poll(() => scene?.pausedAt).toBeDefined();
  const frozen = structuredClone(scene!);
  await page.waitForTimeout(1100);
  expect(scene).toEqual(frozen);
  await page.bringToFront();
  await page.getByLabel("Shared village. Move with WASD or arrow keys.").click();
  await page.keyboard.down("d");
  await page.waitForTimeout(390);
  await page.keyboard.up("d");
  await page.waitForTimeout(150);
  await expect.poll(() => position?.x ?? 0).toBeGreaterThan(500);
  await page.keyboard.press("e");
  await expect(dialog.getByRole("button", { name: "Join scene", exact: true })).toBeVisible();
  await expect(dialog).toContainText("The scene is paused");
  await dialog.getByRole("button", { name: "Regenerate scene", exact: true }).click();
  await expect(dialog).toContainText("0/2 ready");
  expect(scene?.id).not.toBe(frozen.id);
  await expect(guest.getByRole("dialog", { name: "Forest portal" })).toContainText("0/2 ready");
  expect(errors).toEqual([]);
  await context.close();
});

test("settings tabs, FPS, fog and Codex persist and all windows can close", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Close Emberfall" }).click();
  await expect(page.getByLabel("Your adventurer name")).not.toBeVisible();
  await page.getByRole("button", { name: "World browser" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("FPS graph", { exact: true }).check();
  await page.getByLabel("Floating damage numbers").uncheck();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await page.getByLabel("Volumetric fog (2D)", { exact: true }).uncheck();
  await page.getByLabel("Vignette", { exact: true }).uncheck();
  await page.getByRole("tab", { name: "Sound", exact: true }).click();
  await page.getByLabel("Sound effects", { exact: true }).check();
  await page.getByRole("slider", { name: "Effects volume" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: /^Close / }).click();
  await expect(page.getByLabel("Frame rate", { exact: true })).toContainText(/\d+ FPS/);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("FPS graph", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Floating damage numbers")).not.toBeChecked();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await expect(page.getByLabel("Volumetric fog (2D)", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Vignette", { exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: /^Close / }).click();
  await page.getByRole("button", { name: "Codex", exact: true }).click();
  const codex = page.getByRole("dialog", { name: "Codex" });
  await expect(codex.getByRole("tabpanel")).toContainText("Move with WASD");
  await codex.getByRole("tab", { name: "Combat" }).click();
  await expect(codex.getByRole("tabpanel")).toContainText("Skeletons have 10 HP");
  await page.keyboard.press("ArrowRight");
  await expect(codex.getByRole("tab", { name: "The Warden" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(codex.getByRole("tabpanel")).toContainText("200 HP");
  await expect(codex.getByRole("tabpanel").locator("p")).toHaveCSS("color", "rgb(184, 201, 183)");
  await page.screenshot({ path: "test-results/codex.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await codex.getByRole("tab", { name: "Combat" }).click();
  expect(await codex.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/codex-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
