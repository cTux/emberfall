# Persistence and offline imports

[Back to Authoritative game server](../README.md).

Code paths in this guide are relative to `packages/server` unless prefixed with another package or repository directory.

## Persistence

`persistence/progress.ts` binds save decoding, legacy Storehouse migration and
class normalization to the ready catalog. It has no database access.
`persistence/schema.ts` opens SQLite with the existing durability/legacy checks
and initializes server-owned tables after the Colyseus database boots.
`persistence/accounts.ts` owns Steam identity, nickname and session queries;
`persistence/worlds.ts` owns world records and authorized resume membership.
They share the store's connection and savepoint operation; account creation
receives only the character-creation operation. Pure class selection stays in
the progress codec. `characters.ts` retains connection lifetime, transaction and
revision ownership, including atomic merchant writes and save-before-publish.

Version-2 documents keep one account Storehouse (gold and three storage tabs)
beside the class records. Version-1 loads merge class balances/storage once and
return storage overflow to the owning class backpack. Class changes preserve the
shared balance and items. Live `coins`/`storages` fields project this account state;
they are omitted from persisted class records. Back up saves before deployment:
older servers reject version 2 rather than silently dropping the shared items.

`@colyseus/database` boots its SQLite schema through Drizzle. Character progress
uses its cloud-save table, slot 0, and revision field. Small synchronous SQLite
transactions atomically update the save and Emberfall identity metadata.
The repository validates versioned documents and uses compare-and-swap writes;
the native Colyseus save service can read them (covered by tests). SQL touching
that schema is isolated here and must be checked when upgrading the dependency.

Class changes commit before mutating the live player. Autosave runs every five
seconds, and disconnect/shutdown also save. Failures report an error and retain
the live character for retry. Shutdown attempts all characters and closes resources
even after a failed write; the process reports failure with a nonzero exit status.
A process restart restores authorized village
membership, not the previous combat simulation. Bearer keys are stored hashed
on the server and must never be logged.

To import an **offline legacy backup**, stop the destination and choose a new
destination file:

```sh
pnpm import-save path/to/legacy-backup.sqlite path/to/new-characters.sqlite
```

For the startup error `Legacy database detected`, stop the server and back up
the database, then run `pnpm import-save` from the repository root without
arguments. It loads the same root/package `.env` files as server startup, reads
`SAVE_PATH_NEW` (or the default `packages/server/data/characters.sqlite`), and
writes `<source>.imported.sqlite`. Relative configured paths are resolved from
`packages/server`, matching server startup. Explicit command arguments are
resolved from the current directory. The command prints the absolute
`SAVE_PATH_NEW` setting to put in the root `.env` before restarting. Update any
shell or package `.env` override too; rerunning refuses to overwrite the imported
file. The original database is preserved; migration is never performed in place.

The importer opens the source read-only, validates every character, builds a
temporary new database, and publishes it only after successful completion. It
refuses existing destinations. It preserves token hashes, classes, world IDs
and authorized membership. Point `SAVE_PATH_NEW` to the resulting file. Browser
keys are deliberately separate (`emberfall-new.character`); the corresponding
existing bearer key must be explicitly transferred to the new origin/key to
resume that imported character. Do not put bearer keys in documentation or logs.
