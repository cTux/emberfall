import { importLegacy } from "../src/persistence/import-legacy.ts";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

try {
  const args = process.argv.slice(2);
  if (args.length !== 0 && args.length !== 2)
    throw new Error("Usage: pnpm import-save [<legacy-backup.sqlite> <new-destination.sqlite>]");
  const source =
    args[0] ??
    resolve(
      fileURLToPath(new URL("../", import.meta.url)),
      process.env.SAVE_PATH_NEW ?? "data/characters.sqlite",
    );
  const destination = resolve(args[1] ?? `${source}.imported.sqlite`);
  const result = await importLegacy(source, destination);
  console.log(
    `Imported ${result.characters} characters and ${result.worlds} worlds into ${destination}.`,
  );
  console.log(
    "The source database was preserved. Set this in the repository-root .env, then restart the server:",
  );
  console.log(`SAVE_PATH_NEW=${JSON.stringify(destination.replaceAll("\\", "/"))}`);
  console.log("Existing shell or packages/server/.env overrides must also point to this file.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
