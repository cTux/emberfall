# Server ownership and logging

[Back to Authoritative game server](../README.md).

Code paths in this guide are relative to `packages/server` unless prefixed with another package or repository directory.

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
See [Steam operations](../../../docs/operations/steam.md#steam-login-new-runtime). Steam
accounts start fresh; old browser saves remain intact. Account/session tables share
the character database. The server owns nickname changes and character identity;
client bearer/name fields cannot override them. The optional Steam argument on the
server factory is omitted only by isolated legacy-protocol tests, never by the
production entrypoint.

- `account-options.ts` validates canonical HTTPS and client landing URLs;
  `account-cookies.ts` owns strict cookie parsing and secure attributes.
  `accounts.ts` retains login/session orchestration and HTTP authorization.
- `worlds.ts` composes HTTP, Colyseus and the authoritative application. Each
  connection has a private Colyseus session room, preserving browsing and world
  transfers on one connection. A shared in-process party runtime owns combat;
  a Colyseus session room is not an independent copy of that combat world.
- `npc-routines.ts` owns per-world walking, workstation timers and trade
  interruptions. `npcs.ts` coordinates nonblocking dialogue and passes only
  occupied NPC IDs to routines; both use the same canonical world entities.
  `npc-speech.ts` owns topic rotation, prompt context, bounded conversation
  history and speech/silence publication; it never performs model requests.
- `runtime.ts` wires startup, command validation, ordered dispatch and shutdown.
  `runtime/world-membership.ts` owns world/party/NPC lifetimes and save-before-leave;
  `sessions.ts` owns connection/reconnect retention; `admission.ts` owns join,
  resume, password budgets and post-hash authorization checks. `projection.ts`
  selects viewer-visible players, chat and run resources without credentials.
- `runtime/realtime-commands.ts` and `world-commands.ts` use typed handler maps.
  Real-time commands run before the busy-request guard; durable/world actions
  run after it. `simulation.ts` preserves movement/world tick order and catch-up
  clamping; `maintenance.ts` owns heartbeat, playtime and autosave timers.
- `commands/character.ts` dispatches durable character actions through typed
  handlers. Its execution entry point validates identity, life and proximity,
  mutates a detached copy, commits, then publishes live changes.
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

## Bundled content startup

Core initializes the bundled catalog before content-dependent save decode and
session admission. Server retains authoritative scheduling, sessions, ECS
ownership and persistence; it uses core's content-aware validators and rules.
`createCharacterPersistence(context)` binds save helpers and class enumeration to
a ready game for isolated fixtures; the live server uses the default game.
Existing saved IDs retain their meaning. Unknown content fails without silently
dropping progress. See the [mod design](../../../docs/design/mods.md).
