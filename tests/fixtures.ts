import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { once } from "node:events";
import { createGameServer } from "../packages/server/src/worlds.ts";

export const test = base.extend<{ gameServer: void }>({
  gameServer: [
    async ({ baseURL }, provide) => {
      if (process.env.TEST_DEV === "1") return provide();
      const app = createGameServer(resolve("packages/client/dist"), ":memory:", {
        cert: readFileSync(".certs/localhost.pem"),
        key: readFileSync(".certs/localhost-key.pem"),
      });
      app.server.listen(Number(new URL(baseURL!).port), "127.0.0.1");
      await once(app.server, "listening");
      try {
        await provide();
      } finally {
        await app.close();
      }
    },
    { auto: true },
  ],
});
export { expect };
