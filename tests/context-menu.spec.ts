import { test, expect } from "@playwright/test";

test("the canvas blocks the native context menu while inputs keep it", async ({ page }) => {
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
  await page.getByLabel("Your adventurer name").dispatchEvent("contextmenu");
  await expect(page.locator("body")).toHaveAttribute("data-context-menu-prevented", "false");
});
