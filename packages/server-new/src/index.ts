import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { createGameServer } from "./worlds.ts";
import { steamOptionsFromEnv } from "./accounts.ts";
const steam = steamOptionsFromEnv();
const root = fileURLToPath(new URL("../../client-new/dist/", import.meta.url));
const savePath =
  process.env.SAVE_PATH_NEW ?? fileURLToPath(new URL("../data/characters.sqlite", import.meta.url));
const tls =
  process.env.HTTP_ONLY === "1"
    ? undefined
    : {
        cert: readFileSync(
          process.env.TLS_CERT ?? new URL("../../../.certs/localhost.pem", import.meta.url),
        ),
        key: readFileSync(
          process.env.TLS_KEY ?? new URL("../../../.certs/localhost-key.pem", import.meta.url),
        ),
      };
const app = await createGameServer(root, savePath, tls, steam);
const port = Number(process.env.PORT_NEW ?? 3003);
await app.listen(port, process.env.HOST ?? "0.0.0.0");
console.log(`Emberfall new: ${tls ? "https" : "http"}://localhost:${port}`);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close().catch((error) => {
      console.error("Shutdown failed:", error);
      process.exitCode = 1;
    });
  });
