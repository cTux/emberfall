import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { createGameServer } from "./worlds.ts";
const root = fileURLToPath(new URL("../../client/dist/", import.meta.url));
const savePath =
  process.env.SAVE_PATH ?? fileURLToPath(new URL("../data/characters.sqlite", import.meta.url));
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
const app = createGameServer(root, savePath, tls);
const port = Number(process.env.PORT ?? 3001);
app.server.listen(port, process.env.HOST ?? "0.0.0.0", () =>
  console.log(`Emberfall server: ${tls ? "https" : "http"}://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close();
  });
