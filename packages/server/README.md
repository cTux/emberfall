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

## Server logs

`pnpm start` and `pnpm dev` print timestamped major server events to the terminal:
startup/listening, runtime restoration, connections, world creation/removal,
player joins/leaves/reconnects, shutdown and operational failures. Session and
world IDs correlate events without logging credentials or command payloads.
Combat, simulation ticks, movement, chat and successful routine autosaves stay quiet.

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

`persistence/progress.ts` binds save decoding, legacy Storehouse migration and
class normalization to the ready catalog. It has no database access.
`persistence/schema.ts` initializes the server-owned identity/account tables
after the Colyseus database boots. `characters.ts` retains transaction and
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

Village NPCs use a local [Ollama](https://docs.ollama.com/api/chat) service. The
server defaults to `http://127.0.0.1:11434` and `llama3.2:3b`, a roughly 2 GB
model download. No API key is required. OpenCode's free tier rejects external
applications, so `OPENCODE_API_KEY` is no longer used for dialogue.

### Windows setup in G:\AI

From the repository root in PowerShell:

```powershell
pwsh -NoProfile -File scripts/setup-ollama.ps1
```

The script downloads the official signed installer to `G:\AI\downloads`, installs
binaries in `G:\AI\Ollama`, sets the user environment variable `OLLAMA_MODELS` to
`G:\AI\models`, disables cloud features with `OLLAMA_NO_CLOUD=1`, starts Ollama on
loopback and pulls `llama3.2:3b`. Follow the installer prompts. Quit any existing
Ollama tray application or `ollama serve` process before running setup so the
storage settings take effect. Ollama may still keep configuration, tray logs and
installer temporary files in standard Windows profile directories; model files
and installed binaries use G:\AI. The helper's server logs go to `G:\AI\logs`.
See the official [Windows installation guidance](https://docs.ollama.com/windows).

For a smaller download and lower memory needs, run the helper with
`-Model llama3.2:1b` (roughly 1.3 GB), and set `OLLAMA_MODEL=llama3.2:1b` in
Emberfall's root `.env`. Speed depends on the server's CPU/GPU and RAM.

Optional server configuration in the repository-root `.env`:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

`OLLAMA_BASE_URL` and `OLLAMA_MODEL` belong only to the game server; restart it
after edits. `OLLAMA_MODELS` and `OLLAMA_NO_CLOUD` configure the **Ollama process**,
so putting them only in Emberfall's `.env` does not configure an already running
Ollama service. The setup helper persists those two variables for your Windows
user. Restart Ollama after changing them. Requests use native `/api/chat`,
non-streaming output, a 60-second deadline for model loading, bounded generation
and a ten-minute model keep-alive. No model download or service installation runs
automatically from the game server. Cloud model tags are rejected and no paid or
external fallback is used.

Ollama must run on the machine hosting the **game server**, even when the client
is hosted on GitHub Pages. For a separate backend, install Ollama there or configure
a private Ollama endpoint reachable by that backend. Keep port 11434 private;
the browser never needs access to it. On later sessions, start Ollama from its
installed app or run `& 'G:\AI\Ollama\ollama.exe' serve` with the configured user.

### Check and troubleshoot

From the repository root, test the production provider without starting a world
or opening a database (loads the same environment files as server startup):

```sh
node --env-file-if-exists=.env --env-file-if-exists=packages/server/.env packages/server/scripts/check-npc-dialogue.ts
```

The check exits nonzero if the model cannot supply a valid line. Each failed
attempt logs `provider: ollama`, the model, reason (`http`, `network`, `timeout`,
or `invalid_response`), HTTP status or known network error code when available,
elapsed time, deadline and retry delay. The requests run on the server and do not
appear in the browser's Network panel. Cooling requests and world cancellation
stay quiet. Prompts, responses and raw exceptions are never logged.
The first valid response after a failure logs `NPC dialogue provider recovered`
with the provider and model; subsequent healthy responses stay quiet.

`ECONNREFUSED` usually means Ollama is not running or the address is wrong. HTTP
404 usually means the configured model has not been pulled; run
`& 'G:\AI\Ollama\ollama.exe' pull llama3.2:3b`. HTTP 503 can indicate insufficient
resources or an overloaded queue. A timeout includes model loading and generation;
try the smaller model or inspect `ollama ps` and the service logs. An invalid
response includes a safe `validationFailure` code: `missing_body`,
`response_too_large`, `invalid_json`, `incomplete`, `missing_text`, `empty_text`,
`text_too_long` or `control_characters`. These distinguish validation failures
without exposing model output. Line breaks and tabs are folded into spaces;
valid replies retain their full text within the 32 KiB response limit. Spoken text
is capped at 32,768 characters, including for injected providers. Empty answers
and other control/format characters still fail.

If the provider fails, the village visibly receives Silenced and retries after
its cooldown; movement and trading continue. Successful replies restore voices.
Tests inject the HTTP request or dialogue provider and require no installed model.
