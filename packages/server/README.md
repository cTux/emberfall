# Authoritative game server

Run from the repository root with Node 24 and pnpm 11:

```sh
pnpm dev
pnpm build
pnpm start
pnpm test
```

Development and production use port **3003** (`BASE_PORT`, then `PORT_NEW`, override it).
From the repository root, `pnpm start` sets up local HTTPS, builds the runtime
packages, and starts the server only if the build succeeds. It works without
existing `dist` folders after installing dependencies and refreshes the bundles
on each start. To run an already-built deployment without rebuilding, use
`pnpm --filter @emberfall/server start` with certificates already configured.
Production serves `client/dist`. The default database is
`packages/server/data/characters.sqlite`; `SAVE_PATH_NEW=:memory:` is useful
for disposable tests. TLS uses the existing local certificate setup. Ports and override names are retained for compatibility. After the package rename,
keep `SAVE_PATH_NEW` pointing to the existing database or move a stopped backup
from `packages/server-new/data` to `packages/server/data` before startup.

## Ownership and patterns

Steam login is required by the executable. Set `STEAM_ORIGIN` (canonical browser
HTTPS origin, without a trailing slash; the backend callback origin for split hosting) and `STEAM_WEB_API_KEY` before launching.
Both server commands load the repository-root `.env`, then this package's `.env`
if present. Existing shell variables take precedence. Restart after edits.
See [Steam operations](../../docs/operations.md#steam-login-new-runtime). Steam
accounts start fresh; old browser saves remain intact. Account/session tables share
the character database. The server owns nickname changes and character identity;
client bearer/name fields cannot override them. The optional Steam argument on the
server factory is omitted only by isolated legacy-protocol tests, never by the
production entrypoint.

- `worlds.ts` composes HTTP, Colyseus and the authoritative application. Each
  connection has a private Colyseus session room, preserving browsing and world
  transfers on one connection. A shared in-process party runtime owns combat;
  a Colyseus session room is not an independent copy of that combat world.
- `runtime.ts` owns identity, membership, command validation, fixed tick order,
  reconnect retention, chat and save scheduling.
- `ecs/simulation.ts` owns a Miniplex world per party. Components reference the
  canonical player and scene objects. Ordered query views preserve targeting
  tie-breaking when entities are removed. Scene disposal removes its components.
- `systems/movement.ts` consumes at most one tick's input duration, acknowledges
  partial commands, and rejects stale area epochs.
- Shared combat systems in `core` mutate canonical state. The server
  alone decides health, damage, rewards, deaths and persistence.
- The protocol adapter projects ECS state into Colyseus schema records. Position
  fields receive native deltas; infrequently changed entity details are encoded
  in per-entity payloads. It never makes the schema the simulation's owner.
- `characters.ts` is the persistence repository. `http/static.ts` handles
  assets, build identity, cache policy and health checks.

Keep the server single-process while using this SQLite repository and shared
party registry. Adding multiple processes requires an explicit world ownership
and database design; deploying multiple copies is not automatically safe.

## Persistence

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

## Bundled content startup

Core initializes the bundled catalog before content-dependent save decode and
session admission. Server retains authoritative scheduling, sessions, ECS
ownership and persistence; it uses core's content-aware validators and rules.
`createCharacterPersistence(context)` binds save helpers and class enumeration to
a ready game for isolated fixtures; the live server uses the default game.
Existing saved IDs retain their meaning. Unknown content fails without silently
dropping progress. See the [mod design](../../docs/design/mods.md).

## Extend and test

Per-class progress includes equipment IDs. Decode migrates missing equipment to
the correct starter weapon and validates slot/class compatibility. Explicitly empty
loadouts stay empty. Class changes still save before live mutation; derived maximum
HP is synchronized and current health clamped. Validated item commands save a detached character before publishing changes. Shared merchant stock is committed in the same transaction as each trade.

Add content definitions and shared rules before adding command handlers. Keep
transport details out of combat systems. Add an authoritative failure-path test
for commands and a UI test only when player interaction changes. Use temporary
SQLite or `:memory:`; never run tests against actual player data.

`pnpm test` includes native SDK integration, ECS equivalence, persistence
conflicts/imports, prediction, combat and schema patch tests. Browser fixtures
own their server and database and may arrange scene state without shipping
test-only HTTP endpoints. See [development](../../docs/development.md) and the
[runtime design](../../docs/design/new-runtime.md).

## Village dialogue

Village NPCs use the free OpenCode Chat Completions API. Outbound HTTPS access to
`opencode.ai` is required; the documented free chat routes allow anonymous calls.
`OPENCODE_API_KEY` is optional and belongs only in the server environment, never in
client configuration or Git. The explicit free-only model list and current API
endpoint live in `src/npc-models.ts`. Free offers can expire: recheck the
[official catalog](https://opencode.ai/v2/docs/console/models/) before replacing a
route. Never add paid routes as an automatic fallback. If no free route responds,
the village visibly receives Silenced and retries later; movement and trading work.
Tests inject a dialogue provider and do not require external model access.
