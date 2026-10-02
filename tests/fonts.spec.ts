import { test, expect } from "@playwright/test";

test("the bundled Alegreya Sans font loads and is used throughout the interface", async ({
  page,
}) => {
  const response = await page.request.get("/assets/fonts/AlegreyaSans-Regular.ttf");
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeGreaterThan(70000);
  await page.goto("/");
  expect(
    await page.evaluate(async () => {
      const faces = (
        await Promise.all(
          ["16px", "500 16px", "bold 16px", "italic 16px"].map((style) =>
            document.fonts.load(`${style} "Alegreya Sans"`),
          ),
        )
      ).flat();
      return faces.length > 0 && faces.every((face) => face.status === "loaded");
    }),
  ).toBe(true);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const selector of ["h2", "input", "button"]) {
      await expect(page.locator(selector).first()).toHaveCSS(
        "font-family",
        '"Alegreya Sans", sans-serif',
      );
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/font-lobby-${viewport.width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  await expect(page.locator("select").first()).toHaveCSS(
    "font-family",
    '"Alegreya Sans", sans-serif',
  );
  await page.screenshot({ path: "test-results/font-settings.png" });
  await page.getByRole("button", { name: "Close menu" }).click();
  await page.getByRole("button", { name: "Codex", exact: true }).click();
  for (const selector of [".codex-book h3", ".codex-book p", ".codex-page-number"]) {
    await expect(page.locator(selector).first()).toHaveCSS(
      "font-family",
      '"Alegreya Sans", sans-serif',
    );
  }
  await page.screenshot({ path: "test-results/font-codex.png" });
});
