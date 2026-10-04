import { test as base, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createGameServer } from "../packages/server-new/src/worlds.ts";
import { GRAPHICS_PRESETS } from "../packages/client-new/src/graphics.ts";
import {
  steamCallback,
  steamRequest,
  heroId,
  friendId,
} from "../packages/server-new/src/testing/steam.ts";

const test = base.extend<{
  game: Awaited<ReturnType<typeof createGameServer>>;
  profileFails: boolean;
}>({
  profileFails: [false, { option: true }],
  game: [
    async ({ baseURL, profileFails }, provide) => {
      const app = await createGameServer(
        resolve("packages/client-new/dist"),
        ":memory:",
        {
          cert: readFileSync(".certs/localhost.pem"),
          key: readFileSync(".certs/localhost-key.pem"),
        },
        {
          origin: baseURL!,
          apiKey: "test",
          request: (input, init) => {
            if (profileFails && String(input).includes("GetPlayerSummaries"))
              return Promise.resolve(new Response("Unavailable", { status: 503 }));
            return steamRequest(input, init);
          },
        },
      );
      await app.listen(Number(new URL(baseURL!).port));
      try {
        await provide(app);
      } finally {
        await app.close();
      }
    },
    { auto: true },
  ],
});
test.use({ actionTimeout: 15_000 });
async function login(page: Page, id = heroId) {
  await page.addInitScript(
    (graphics) => localStorage.setItem("emberfall-new.graphics", JSON.stringify(graphics)),
    GRAPHICS_PRESETS.Balanced,
  );
  await page.route("**/auth/steam", async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const location = response.headers()["location"];
    expect(new URL(location).hostname).toBe("steamcommunity.com");
    await route.fulfill({
      response,
      headers: { ...response.headers(), location: steamCallback(location, id).toString() },
    });
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in through Steam" }).click();
}
async function edit(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "Change nickname", exact: true }).click();
}

test("Steam players see the server list during an outage and resume automatically", async ({
  page,
  game,
}) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        (window as unknown as { recoverySocket: WebSocket }).recoverySocket = this;
      }
    };
  });
  await login(page);
  await page.getByRole("button", { name: "Save nickname", exact: true }).click();
  await page.getByRole("button", { name: /^Join New Permanent World/ }).click();
  await expect(page.locator(".party")).toContainText("Steam Hero");
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  let unavailable = true;
  let failures = 0;
  await page.route("**/api/account/ticket", (route) => {
    if (unavailable) {
      failures++;
      return route.fulfill({ status: 503 });
    }
    return route.continue();
  });
  await page.evaluate(() =>
    (window as unknown as { recoverySocket: WebSocket }).recoverySocket.close(3001),
  );
  await expect(page.getByRole("region", { name: "Emberfall", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Join a world" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".party")).toBeHidden();
  await expect.poll(() => failures).toBeGreaterThanOrEqual(2);
  unavailable = false;
  await expect(page.locator(".party")).toContainText("Steam Hero");
  await expect(page.getByRole("region", { name: "Emberfall", exact: true })).toBeHidden();
  expect(world.players.size).toBe(1);
  expect([...world.players.values()][0]).toBe(player);
});
test("Steam onboarding, repeat login, shared rename dialog and another player's view", async ({
  page,
  browser,
  baseURL,
  game,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("emberfall-new.character", "preserved-legacy-key"),
  );
  await login(page);
  await expect(page.getByRole("dialog", { name: "Choose your nickname" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nickname" })).toHaveValue("Steam Hero");
  await page.screenshot({ path: info.outputPath("nickname-onboarding.png") });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Nickname" })).toHaveValue("Steam Hero");
  await page.getByRole("textbox", { name: "Nickname" }).fill("Ember Hero");
  await page.getByRole("button", { name: "Save nickname", exact: true }).click();
  await expect(page.getByText("Playing as Ember Hero", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Join New Permanent World/ }).click();
  await expect(page.locator(".party")).toContainText("Ember Hero");
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  try {
    const friend = await context.newPage();
    await login(friend, friendId);
    await friend.getByRole("button", { name: "Save nickname", exact: true }).click();
    await friend.getByRole("button", { name: /^Join New Permanent World/ }).click();
    await expect(friend.locator(".party")).toContainText("Ember Hero");
    await edit(page);
    await expect(page.getByRole("textbox", { name: "Nickname" })).toHaveValue("Ember Hero");
    await page.getByRole("textbox", { name: "Nickname" }).fill("Cancelled");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(game.runtime.characters.steamAccount(heroId)?.nickname).toBe("Ember Hero");
    await edit(page);
    await page.getByRole("textbox", { name: "Nickname" }).fill("Renamed Hero");
    await page.route(
      "**/api/account/nickname",
      (route) => route.fulfill({ status: 503, json: { error: "Save unavailable. Retry." } }),
      { times: 1 },
    );
    await page.getByRole("button", { name: "Save nickname", exact: true }).click();
    await expect(page.getByText("Save unavailable. Retry.")).toBeVisible();
    expect(game.runtime.characters.steamAccount(heroId)?.nickname).toBe("Ember Hero");
    await page.getByRole("button", { name: "Save nickname", exact: true }).click();
    await expect(friend.locator(".party")).toContainText("Renamed Hero");
    await page.screenshot({ path: info.outputPath("renamed-village.png") });
    await page.reload();
    await expect(page.locator(".party")).toContainText("Renamed Hero");
    await expect(page.getByRole("dialog", { name: "Choose your nickname" })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("emberfall-new.character"))).toBe(
      "preserved-legacy-key",
    );
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Account", exact: true }).click();
    await page.screenshot({ path: info.outputPath("account-settings.png") });
    await friend.close();
    await page.getByRole("button", { name: "Sign out of Steam account" }).click();
    await expect(page.getByRole("link", { name: "Sign in through Steam" })).toBeVisible();
    await login(page);
    await expect(page.getByText("Playing as Renamed Hero", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Choose your nickname" })).toHaveCount(0);
    await page.close();
    const device = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
    try {
      const next = await device.newPage();
      await login(next);
      await expect(next.getByText("Playing as Renamed Hero", { exact: true })).toBeVisible();
      await expect(next.getByRole("dialog", { name: "Choose your nickname" })).toHaveCount(0);
      expect(await next.evaluate(() => localStorage.getItem("emberfall-new.character"))).toBeNull();
    } finally {
      await device.close();
    }
  } finally {
    await context.close();
  }
});

test.describe("profile outage", () => {
  test.use({ profileFails: true });
  test("manual nickname entry remains available on a narrow screen", async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await expect(
      page.getByText("Steam's nickname is unavailable. Enter your nickname here."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save nickname", exact: true })).toBeDisabled();
    await page.getByRole("textbox", { name: "Nickname" }).fill("x".repeat(25));
    await expect(page.getByRole("button", { name: "Save nickname", exact: true })).toBeDisabled();
    await page.getByRole("textbox", { name: "Nickname" }).fill("Мандрівник");
    await page.screenshot({ path: info.outputPath("nickname-narrow.png") });
    await page.getByRole("textbox", { name: "Nickname" }).press("Enter");
    await expect(page.getByText("Playing as Мандрівник", { exact: true })).toBeVisible();
  });
});
