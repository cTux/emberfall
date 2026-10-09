import { test, expect } from "./fixtures";
import { BUILDINGS, INNKEEPER } from "../packages/common-new/src/index.ts";

test("Marta opens the service placeholder while the Inn has no interaction", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = INNKEEPER.x;
  player.y = INNKEEPER.y + 35;
  const dialog = page.getByRole("dialog", { name: INNKEEPER.name });
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(dialog).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(dialog).toContainText(`${INNKEEPER.name} services are coming in a future update.`);
  await page.screenshot({ path: "test-results/innkeeper-placeholder.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.screenshot({ path: "test-results/innkeeper-idle.png" });
  for (let frame = 0; frame < 4; frame++) {
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `test-results/innkeeper-idle-${frame}.png`,
      clip: { x: 685, y: 365, width: 70, height: 70 },
    });
  }
  const inn = BUILDINGS.find((building) => building.id === "inn")!;
  player.x = inn.doorX;
  player.y = inn.y + 9;
  // Allow the confirmed relocation to reach presentation before testing E.
  await page.waitForTimeout(500);
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toBeHidden();
  const hall = BUILDINGS.find((building) => building.id === "hall")!;
  player.x = hall.doorX;
  player.y = hall.y + 9;
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(page.getByRole("dialog", { name: hall.name })).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  expect(errors).toEqual([]);
});
