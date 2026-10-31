# Save storage, migration and backups

[Back to Running, hosting and saves](../operations.md).

## Persistence and backup

Account-wide Storehouse saves use format version 2. Back up the stopped database
before upgrading: old class gold is summed and old storages merged on first load
and committed by the next save. Items beyond shared capacity return to the owning
class backpack. Older builds reject version 2; rollback requires the matching
pre-upgrade backup. Retain a post-upgrade backup to preserve new progress.

The package rename moves the default database location from `packages/server-new/data/characters.sqlite` to `packages/server/data/characters.sqlite`. Keep `SAVE_PATH_NEW` set to the existing absolute path, or stop the server and move a backup to the new default before starting. Move package-local `.env` files with the server package. No automatic database migration or save linking occurs. Ports, environment variable names and `emberfall-new.*` browser keys are retained.

The server uses Node 24's built-in SQLite database at `packages/server/data/characters.sqlite` in both development and production. `SAVE_PATH_NEW` overrides this path; keep it on persistent storage. Saves include name, level, XP, current/max HP, and total time in worlds. Authorized world membership is persisted; live positions and combat scenes remain temporary. Saves happen on entry, every five seconds, on leave/disconnect, and on graceful shutdown; an abrupt process or machine failure can lose up to five seconds of recent changes. SQLite uses WAL and full synchronous writes. Stop the server before copying the database for backup, or use a SQLite-aware online backup that includes committed WAL data. Never put the database under the client public directory.

For a stopped-server backup, preserve the data directory before upgrading and restore only while stopped. Keep a compatible application build with the backup. Live scene restoration is not implemented; Steam login recovers account identity. see [characters](../specs/characters.md).
