import { importLegacy } from "../src/persistence/import-legacy.ts";
const [source, destination, ...extra] = process.argv.slice(2);
if (!source || !destination || extra.length)
  throw new Error("Usage: pnpm import-save-new <legacy-backup.sqlite> <new-destination.sqlite>");
const result = await importLegacy(source, destination);
console.log(
  `Imported ${result.characters} characters and ${result.worlds} worlds into the new database.`,
);
