import { test, expect } from "./fixtures";
import { INNKEEPER } from "../packages/common-new/src/index.ts";

test("inventory equips, unequips and consumes stacks; shared trading transfers items and gold", async ({
  page,
  game,
  browser,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Seller");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Inventory (I)" })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.backpack = [
    { id: "helmet", itemId: "loot-helmet", quantity: 1 },
    { id: "potion", itemId: "health-potion", quantity: 3 },
  ];
  player.coins = 0;
  player.hitpoints = 60;
  await page.keyboard.press("i");
  const inventory = page.getByRole("dialog", { name: "Inventory", exact: true });
  await expect(inventory).toBeVisible();
  const backpack = inventory.getByRole("region", { name: "Your backpack" });
  await expect(backpack.getByRole("button", { name: "Use Health potion (3)" })).toBeVisible();
  await backpack.getByRole("button", { name: "Use Helmet", exact: true }).hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Armor: 1");
  await expect(tooltip.locator("p").last()).toHaveText("1 gold");
  await backpack
    .getByRole("button", { name: "Use Helmet", exact: true })
    .click({ button: "right" });
  await expect(
    inventory.getByRole("button", { name: "Helmet: Helmet", exact: true }),
  ).toBeVisible();
  await expect(inventory.getByRole("region", { name: "Character stats" })).toContainText("Armor1");
  expect(player.equipment!.helmet).toBe("loot-helmet");
  await inventory
    .getByRole("button", { name: "Helmet: Helmet", exact: true })
    .click({ button: "right" });
  await expect(backpack.getByRole("button", { name: "Use Helmet", exact: true })).toBeVisible();
  await expect(inventory.getByRole("region", { name: "Character stats" })).toContainText("Armor0");
  await inventory.locator('[data-equipment-slot="weapon"]').click({ button: "right" });
  await expect(inventory.getByRole("button", { name: "Weapon: Empty", exact: true })).toBeVisible();
  await backpack.getByRole("button", { name: "Use Warrior's sword", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    inventory.getByRole("button", { name: "Weapon: Warrior's sword", exact: true }),
  ).toBeVisible();
  await backpack.getByRole("button", { name: "Use Health potion (3)" }).click({ button: "right" });
  await expect(backpack.getByRole("button", { name: "Use Health potion (2)" })).toBeVisible();
  expect(player.hitpoints).toBe(85);
  await page.screenshot({ path: "test-results/inventory-desktop.png" });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(inventory).toBeVisible();
  expect(await inventory.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/inventory-narrow.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.press("Escape");
  player.x = INNKEEPER.x;
  player.y = INNKEEPER.y - 15;
  const trader = page.getByRole("dialog", { name: INNKEEPER.name });
  await expect(async () => {
    await page.keyboard.press("e");
    await expect(trader).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(trader.getByLabel("Innkeeper's backpack: 5000 coins")).toBeVisible();
  await trader.getByRole("button", { name: "Sell Helmet", exact: true }).click({ button: "right" });
  await expect(trader.getByRole("button", { name: "Buy Helmet", exact: true })).toBeVisible();
  await expect(trader.getByLabel("Your backpack: 1 coins")).toBeVisible();
  expect(world.merchant!.coins).toBe(4999);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const secondPage = await context.newPage();
    await secondPage.bringToFront();
    await secondPage.goto(baseURL!);
    await secondPage.getByLabel("Your adventurer name").fill("Buyer");
    await secondPage.getByRole("button", { name: /^Join Playtest Default/ }).click();
    await expect(secondPage.getByRole("button", { name: "Inventory (I)" })).toBeVisible();
    const buyer = [...world.players.values()].find((p) => p.name === "Buyer")!;
    buyer.x = INNKEEPER.x;
    buyer.y = INNKEEPER.y - 15;
    buyer.coins = 1;
    await expect(secondPage.getByLabel("Buyer: 1 coins")).toBeVisible();
    await secondPage.locator("canvas").click({ position: { x: 5, y: 5 } });
    const secondTrader = secondPage.getByRole("dialog", { name: INNKEEPER.name });
    await expect(async () => {
      await secondPage.keyboard.press("e");
      await expect(secondTrader).toBeVisible();
    }).toPass({ intervals: [200], timeout: 6000 });
    await secondTrader
      .getByRole("button", { name: "Buy Helmet", exact: true })
      .click({ button: "right" });
    await expect(
      secondTrader.getByRole("button", { name: "Sell Helmet", exact: true }),
    ).toBeVisible();
    await expect(trader.getByRole("button", { name: "Buy Helmet", exact: true })).toHaveCount(0);
    expect(buyer.coins).toBe(0);
    expect(world.merchant!.coins).toBe(5000);
    // Rejected purchase keeps the stock and both balances.
    await secondTrader
      .getByRole("button", { name: "Buy Health potion (5)" })
      .click({ button: "right" });
    await expect(secondTrader.getByRole("alert")).toContainText("Not enough gold");
    expect(world.merchant!.backpack[0].quantity).toBe(5);
    await page.screenshot({ path: "test-results/innkeeper-trading.png" });
    // Moving away rejects an action even if the trader window remains open.
    buyer.x = 2400;
    buyer.y = 1280;
    await secondTrader
      .getByRole("button", { name: "Sell Helmet", exact: true })
      .click({ button: "right" });
    await expect(secondTrader.getByRole("alert")).toContainText("Trade near Marta");
    expect(buyer.backpack!.length).toBe(1);
  } finally {
    await context.close();
  }
  expect(errors).toEqual([]);
});
