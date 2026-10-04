import { test, expect } from "./fixtures";

test("the native context menu is blocked across the page and portaled menus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Close Emberfall" }).click();
  await page.evaluate(() => {
    window.addEventListener("contextmenu", (event) => {
      document.body.dataset.contextMenuPrevented = String(event.defaultPrevented);
    });
  });
  await page.locator("canvas").click({ button: "right" });
  await expect(page.locator("body")).toHaveAttribute("data-context-menu-prevented", "true");
  await page.getByRole("button", { name: "World browser" }).click();
  for (const target of [
    page.getByLabel("Your adventurer name"),
    page.getByRole("heading", { name: "Emberfall", exact: true }),
    page.getByRole("button", { name: "Settings", exact: true }),
  ]) {
    await page.locator("body").evaluate((body) => delete body.dataset.contextMenuPrevented);
    await target.click({ button: "right" });
    await expect(page.locator("body")).toHaveAttribute("data-context-menu-prevented", "true");
  }
  await page.getByLabel("Your adventurer name").fill("Wanderer");
  await expect(page.getByLabel("Your adventurer name")).toHaveValue("Wanderer");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await page.getByRole("combobox", { name: "Render resolution" }).click();
  const option = page.getByRole("option").first();
  await page.locator("body").evaluate((body) => delete body.dataset.contextMenuPrevented);
  await option.click({ button: "right" });
  await expect(page.locator("body")).toHaveAttribute("data-context-menu-prevented", "true");
  await option.click();
  await expect(page.getByRole("listbox")).toBeHidden();
  expect(
    await page
      .locator("body")
      .evaluate((body) =>
        body.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })),
      ),
  ).toBe(false);
});
