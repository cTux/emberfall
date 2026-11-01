# Network, sessions and persistence

Status: implemented. Implements [worlds/chat](../specs/worlds-and-chat.md) and [characters](../specs/characters.md). See [movement](movement.md) for input timing and [Steam accounts](steam-accounts.md) for authentication.

## Transport and trust boundary

[worlds.ts](../../packages/server/src/worlds.ts) composes HTTP, Colyseus session rooms and the authoritative runtime. [runtime.ts](../../packages/server/src/runtime.ts) owns membership, command validation and tick ordering. The server derives identity and world from the authenticated session. Shared Zod schemas validate commands; client claims never grant damage, items or progress.

Each connection has a private session room; one in-process party simulation owns shared combat. [Protocol state](../../packages/common/src/protocol/state.ts) projects canonical state into Colyseus schemas. The client reconstructs detached snapshots. See [runtime design](new-runtime.md) for replication, budgets and ownership.

## Catalog validation

Common validates structural message/save shapes; core validates registered IDs,
class/slot compatibility and inventory semantics. Server uses both layers before
mutation. The bundled catalog initializes before save decode/session admission.
`createCharacterPersistence(context)` enumerates registered classes and rejects
unknown saved class IDs without discarding records. Save versions and transaction
ordering are unchanged. See [validation contracts](mods/lifecycle.md#validation-and-stable-contracts).

## Recovery lifecycle

Interrupted players remain for 10 seconds with a Reconnecting debuff and red tint. They cannot move, attack, be targeted or take hits. Resume clears the timer and status without replacing the player. Expiry saves before removal; failures retain state for autosave retry. Explicit leave removes membership immediately.

The browser clears displayed state and gameplay dialogs on interruption, shows the world browser and retries recovery. Remembered world state uses sessionStorage; presentation and legacy-protocol fixture identity retain their existing `emberfall-new.*` storage keys. Production identity belongs to Steam accounts and HttpOnly sessions. Process restart restores authorized village membership, not combat scenes, positions or chat.

Client build checks load `version.json` before recovery. Mismatches warn in yellow without automatic reloads or blocking gameplay; invalid or failed checks retry. See [deployment](../operations/deployment.md#deployment-and-cache-consistency).

Both Vite builds derive a `1.0.patch` game version from first-parent Git history
since the `1.0.375` versioning release in [game-version.ts](../../scripts/game-version.ts).
Server pong messages include the embedded version, so independently built client
and server bundles from one revision agree. The client compares every reply;
unknown or differing versions show yellow, while unavailable connections show
red and take priority. Version metadata is optional for older servers.

## Persistence and failure behavior

[CharacterStore](../../packages/server/src/characters.ts) stores versioned validated progress through the Colyseus SQLite schema, with revision checks and atomic character/merchant writes. Class and inventory changes save detached state before publishing. Autosave runs every five seconds; disconnect and shutdown also save. Failures surface errors and retain state for retry. Shutdown attempts every save and closes resources even after failures.

Older progress documents preserve fractional XP and class progress, default missing equipment/backpacks/coins, and discard obsolete mana. Import an offline legacy backup only into a new destination with `pnpm import-save`; without arguments it reads the configured server database, writes a separate `<source>.imported.sqlite`, and prints the required `SAVE_PATH_NEW` setting. Stop the server and back up the source first; see the [server guide](../../packages/server/README.md). Renaming packages does not migrate a database. Deployments must keep `SAVE_PATH_NEW` pointing to their existing database, or move a stopped backup from `packages/server-new/data` to `packages/server/data`.

## Verification

Account Storehouse ownership is persisted once in version-2 saves, beside class
records. Version-1 balances and storage contents migrate without discarding items;
class switches keep the same shared balance and inventories. See
[Storehouse rules](../../packages/server/src/storehouse.test.ts),
[migration tests](../../packages/server/src/storehouse-migrations.test.ts) and
[transaction tests](../../packages/server/src/storehouse-transactions.test.ts) for overflow,
idempotent migration, restart, isolation and save-failure coverage.

Use [world tests](../../packages/server/src/worlds.test.ts), [character tests](../../packages/server/src/characters.test.ts), [account tests](../../packages/server/src/account-http-admission.test.ts), [reconnect tests](../../packages/server/src/reconnect.test.ts), [update recovery tests](../../packages/server/src/update-recovery.test.ts) and [chat tests](../../packages/server/src/chat.test.ts). Browser coverage includes [reconnect](../../tests/reconnect.spec.ts), [accounts](../../tests/accounts.spec.ts) and [gameplay](../../tests/gameplay.spec.ts). Use disposable databases, never live player saves.
