import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createGameServer } from "../packages/server-new/src/worlds.ts";
import { GRAPHICS_PRESETS } from "../packages/client-new/src/graphics.ts";

type Game = Awaited<ReturnType<typeof createGameServer>>;
/** Tests own their server and in-memory database. Fixture setup can arrange a
 * scene directly; browser actions and updates always cross the real SDK boundary.
 */
export const test = base.extend<{
  game: Game;
  graphicsPreset: keyof typeof GRAPHICS_PRESETS | null;
}>({
  graphicsPreset: ["Balanced", { option: true }],
  page: async ({ page, graphicsPreset }, provide) => {
    if (graphicsPreset)
      await page.addInitScript(
        (settings) => localStorage.setItem("emberfall-new.graphics", JSON.stringify(settings)),
        GRAPHICS_PRESETS[graphicsPreset],
      );
    await provide(page);
  },
  game: [
    async ({ baseURL }, provide) => {
      const game = await createGameServer(resolve("packages/client-new/dist"), ":memory:", {
        cert: readFileSync(".certs/localhost.pem"),
        key: readFileSync(".certs/localhost-key.pem"),
      });
      await game.listen(Number(new URL(baseURL!).port));
      try {
        await provide(game);
      } finally {
        await game.close();
      }
    },
    { auto: true },
  ],
});
export { expect };
