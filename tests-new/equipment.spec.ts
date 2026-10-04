import { test, expect } from "./fixtures";
import {
  CLASS_IDS,
  CLASS_LABELS,
  WARDROBE,
  starterEquipment,
} from "../packages/common-new/src/index.ts";

test("equipment shows all class starters and stats; physical I, tooltips, dragging and responsive layout work", async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Gear tester");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  const opener = page.getByRole("button", { name: "Equipment (I)" });
  await expect(opener).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const dialog = page.getByRole("dialog", { name: "Equipment", exact: true });
  const physicalI = (key = "ш", repeat = false) =>
    page.evaluate(
      ({ key, repeat }) => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { code: "KeyI", key, repeat, bubbles: true }),
        );
      },
      { key, repeat },
    );
  await physicalI();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-equipment-slot]")).toHaveCount(9);
  await expect(dialog.locator('[data-equipped="true"]')).toHaveCount(1);
  await expect(dialog.getByRole("region", { name: "Character stats" })).toContainText("150%");
  await physicalI("i", true);
  await expect(dialog).toBeVisible();
  const sword = dialog.getByRole("button", { name: "Weapon: Warrior's sword" });
  await page.keyboard.press("Tab");
  await sword.focus();
  const itemTooltip = page.getByRole("tooltip").filter({ hasText: "Warrior's sword" });
  await expect(itemTooltip).toBeVisible();
  await expect(itemTooltip.locator(".MuiTooltip-tooltip").first()).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0.88)",
  );
  expect(
    (await itemTooltip.locator(".MuiTooltip-tooltip").first().boundingBox())!.width,
  ).toBeLessThanOrEqual(236);
  await expect(itemTooltip.getByRole("button", { name: "Power: 5", exact: true })).toBeVisible();
  await expect(itemTooltip.getByRole("button", { name: "Range: 88", exact: true })).toBeVisible();
  await expect(itemTooltip.getByRole("button", { name: "Cooldown: 1", exact: true })).toBeVisible();
  await expect(itemTooltip).not.toContainText("Deal 5 damage");
  const bleed = itemTooltip.getByRole("button", { name: "Bleed", exact: true });
  await expect(bleed).toHaveText("");
  // Tab from the focused slot into its portalless tooltip, inside the modal.
  await page.keyboard.press("Tab");
  await expect(itemTooltip.getByRole("button", { name: "Power: 5", exact: true })).toBeFocused();
  await expect(page.getByRole("tooltip").last()).toContainText("Deal 5 damage");
  await bleed.focus();
  await bleed.hover();
  await expect(page.getByRole("tooltip").last()).toContainText("10% chance to apply Bleed");
  await page.getByRole("tooltip").last().hover();
  await expect(bleed).toBeVisible();
  await expect(page.getByRole("tooltip").last()).toContainText("new stacks refresh the duration");
  await page.screenshot({ path: "test-results/equipment-badges-bleed.png" });
  await bleed.focus();
  await expect(bleed).toBeFocused();
  await expect(itemTooltip).toBeVisible();
  await expect(itemTooltip).not.toContainText("Attack speed");
  await expect(sword).toHaveCSS("border-top-width", "0px");
  await page.mouse.move(0, 0);
  await dialog.getByRole("heading", { name: "Equipment", exact: true }).click();
  await expect(page.getByRole("tooltip")).toBeHidden();
  const gloves = dialog.getByRole("button", { name: "Gloves: Empty" });
  await page.keyboard.press("Tab");
  await gloves.focus();
  await expect(page.getByRole("tooltip")).toContainText("Accepts: Gloves");
  await expect(gloves.locator('[aria-hidden="true"]').first()).toHaveCSS("opacity", "0.25");
  await dialog.getByRole("heading", { name: "Equipment", exact: true }).click();
  const before = (await dialog.boundingBox())!;
  const title = (await dialog
    .getByRole("heading", { name: "Equipment", exact: true })
    .boundingBox())!;
  await page.mouse.move(title.x + 60, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x + 135, title.y + 55, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await dialog.boundingBox())!.x).toBeGreaterThan(before.x + 50);
  const dragged = (await dialog.boundingBox())!;
  await physicalI();
  await expect(dialog).toBeHidden();
  await opener.click();
  await expect(dialog).toBeVisible();
  expect(Math.abs((await dialog.boundingBox())!.x - dragged.x)).toBeLessThan(3);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await physicalI();
  await expect(dialog).toBeHidden();
  await page.keyboard.press("Escape");
  await page.getByRole("complementary", { name: "World chat", exact: true }).hover();
  const chat = page.getByLabel("Chat message", { exact: true });
  await chat.fill("i");
  await chat.press("i");
  await expect(dialog).toBeHidden();
  await chat.fill("");
  await chat.blur();
  for (const classId of CLASS_IDS) {
    player.x = WARDROBE.x;
    player.y = WARDROBE.y - 15;
    const wardrobe = page.getByRole("dialog", { name: "Wardrobe" });
    await expect(async () => {
      await page.keyboard.press("e");
      await expect(wardrobe).toBeVisible();
    }).toPass({ intervals: [200], timeout: 6000 });
    const choice = wardrobe.getByRole("button", { name: new RegExp(`^${CLASS_LABELS[classId]}`) });
    if (player.classId !== classId) await choice.click();
    await expect.poll(() => player.classId).toBe(classId);
    expect(player.equipment).toEqual(starterEquipment(classId));
    await wardrobe.getByRole("button", { name: "Close Wardrobe", exact: true }).click();
    await expect(wardrobe).toHaveCount(0);
    await physicalI();
    await expect(dialog.locator('[data-equipped="true"]')).toHaveCount(1);
    const type = { warrior: "Physical", ranger: "Poison", mage: "Fire", druid: "Nature" }[classId];
    await expect(dialog.getByRole("region", { name: "Character stats" })).toContainText(type);
    await expect(dialog.getByRole("region", { name: "Character stats" })).toContainText(
      "Cooldown1 sec",
    );
    await expect(dialog).not.toContainText("Attack speed");
    const weapon = dialog.locator('[data-equipment-slot="weapon"]');
    await weapon.hover();
    const badge = page.locator('[data-equipment-badge="range"]');
    await expect(badge).toHaveAttribute(
      "aria-label",
      `Range: ${(classId === "warrior" ? 88 : classId === "ranger" ? 1000 : 250).toLocaleString("en")}`,
    );
    const effect = { warrior: "bleed", ranger: "poison", mage: "burn", druid: "roots" }[classId];
    await page.locator(`[data-equipment-badge="${effect}"]`).last().hover();
    await expect(page.getByRole("tooltip").last()).toContainText(
      classId === "druid"
        ? "Bosses take damage but remain mobile"
        : "new stacks refresh the duration",
    );
    const stats = dialog.getByRole("region", { name: "Character stats" });
    const automaticRange = { warrior: 88, ranger: 1000, mage: 250, druid: 250 }[classId];
    const manualRange = classId === "warrior" ? 88 : 1000;
    await expect(stats.getByText("Range", { exact: true })).toHaveCount(1);
    await expect(stats).toContainText(`Range${automaticRange.toLocaleString("en")} units`);
    await expect(stats).not.toContainText("Target range");
    await expect(stats).not.toContainText("Manual range");
    await physicalI();
    await page.keyboard.press("g");
    await expect.poll(() => player.autoTarget).toBe(false);
    await physicalI();
    await expect(stats).toContainText(`Range${manualRange.toLocaleString("en")} units`);
    await weapon.hover();
    await expect(page.locator('[data-equipment-badge="range"]')).toHaveAttribute(
      "aria-label",
      `Range: ${manualRange.toLocaleString("en")}`,
    );
    await physicalI();
    await page.keyboard.press("g");
    await expect.poll(() => player.autoTarget).toBe(true);
    await physicalI();
    await expect(stats).toContainText(`Range${automaticRange.toLocaleString("en")} units`);
    await weapon.hover();
    await expect(page.locator(`[data-equipment-badge="${effect}"]`).last()).toBeVisible();
    await page.screenshot({ path: `test-results/equipment-${classId}.png` });
    await dialog.getByRole("button", { name: "Close Equipment", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await opener.click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(dialog).toBeVisible();
    await expect.poll(async () => (await dialog.boundingBox())!.x).toBeGreaterThanOrEqual(0);
    await expect
      .poll(async () => {
        const box = (await dialog.boundingBox())!;
        return box.x + box.width;
      })
      .toBeLessThanOrEqual(width);
    await dialog.getByText("Damage reduction", { exact: true }).scrollIntoViewIfNeeded();
    await expect(dialog.getByText("Damage reduction", { exact: true })).toBeVisible();
    await dialog.locator('[data-equipment-slot="weapon"]').hover();
    await page.getByRole("button", { name: "Roots", exact: true }).hover();
    await expect(page.getByRole("tooltip").last()).toContainText(
      "Bosses take damage but remain mobile",
    );
    for (const tooltip of await page.getByRole("tooltip").all()) {
      const box = (await tooltip.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  }
  await page.screenshot({ path: "test-results/equipment-narrow.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  // Fixture-arranged forest still uses real replicated gear and the same window.
  world.scene = {
    ...world.training!,
    id: "equipment-forest",
    electorate: "",
    training: false,
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  player.scene = "forest";
  player.equipment = {};
  await expect(page.getByRole("status").filter({ hasText: /Forest/ })).toBeVisible();
  await physicalI();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-equipped="true"]')).toHaveCount(0);
  await expect(dialog.getByRole("region", { name: "Character stats" })).toContainText("Power0");
  expect(errors).toEqual([]);
});
