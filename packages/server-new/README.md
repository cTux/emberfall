# Authoritative new game server

Run from the repository root with Node 24 and pnpm 11:

```sh
pnpm dev-new
pnpm build-new
pnpm start-new
pnpm test-new
```

Development and production use port **3003** (`PORT_NEW` overrides it).
From the repository root, `pnpm start-new` sets up local HTTPS, builds both new
packages, and starts the server only if the build succeeds. It works without
existing `dist` folders after installing dependencies and refreshes the bundles
on each start. To run an already-built deployment without rebuilding, use
`pnpm --filter @emberfall/server-new start` with certificates already configured.
Production serves `client-new/dist`. The default database is
`packages/server-new/data/characters.sqlite`; `SAVE_PATH_NEW=:memory:` is useful
for disposable tests. TLS uses the existing local certificate setup. The
original server's port, save path, and packages are not used.

## Ownership and patterns

Steam login is required by the executable. Set `STEAM_ORIGIN` (canonical browser
HTTPS origin, without a trailing slash) and `STEAM_WEB_API_KEY` before launching.
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
- Shared combat systems in `common-new` mutate canonical state. The server
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
pnpm import-save-new path/to/legacy-backup.sqlite path/to/new-characters.sqlite
```

The importer opens the source read-only, validates every character, builds a
temporary new database, and publishes it only after successful completion. It
refuses existing destinations. It preserves token hashes, classes, world IDs
and authorized membership. Point `SAVE_PATH_NEW` to the resulting file. Browser
keys are deliberately separate (`emberfall-new.character`); the corresponding
existing bearer key must be explicitly transferred to the new origin/key to
resume that imported character. Do not put bearer keys in documentation or logs.

## Extend and test

Per-class progress includes equipment IDs. Decode migrates missing equipment to
the correct starter weapon and validates slot/class compatibility. Explicitly empty
loadouts stay empty. Class changes still save before live mutation; derived maximum
HP/MP are synchronized and current resources clamped. No client equipment or stat
mutation command is exposed by the inspection feature.

Add content definitions and shared rules before adding command handlers. Keep
transport details out of combat systems. Add an authoritative failure-path test
for commands and a UI test only when player interaction changes. Use temporary
SQLite or `:memory:`; never run tests against actual player data.

`pnpm test-new` includes native SDK integration, ECS equivalence, persistence
conflicts/imports, prediction, combat and schema patch tests. Browser fixtures
own their server and database and may arrange scene state without shipping
test-only HTTP endpoints. See [development](../../docs/development.md) and the
[runtime design](../../docs/design/new-runtime.md).
