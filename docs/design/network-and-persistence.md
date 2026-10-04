# Network, sessions and persistence

Status: implemented. Implements [worlds/chat](../specs/worlds-and-chat.md) and [characters](../specs/characters.md). [Movement](movement.md) defines high-frequency input timing.

## Transport and trust boundary

The new runtime uses [Steam accounts](steam-accounts.md) for authentication,
nickname ownership and session security. It preserves old browser saves without
linking them. The following describes the original runtime.

[worlds.ts](../../packages/server/src/worlds.ts) serves `/health`, static production files and `/ws`. The upgrade checks path, browser Origin host and connection capacity. WebSocket messages pass the Zod discriminated union in [common/index.ts](../../packages/common/src/index.ts). The server derives the acting character and world from the session, never a client-supplied damage or identity claim.

Input safeguards include a 2,048-byte message limit, 256-session upgrade limit, bounded password hashing, message/action rate limits, slow-consumer eviction and heartbeat cleanup. Passwords use random salts, scrypt and timing-safe comparison; public world listings expose a locked flag, not hashes. These controls are per process/connection and do not replace ingress limits for public hosting.

## Message families

| Direction       | Messages                                                         | Meaning                                                     |
| --------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Client → server | `create`, `join`, `resume`, `leave`                              | World membership and character authentication               |
| Client → server | `move`, `combatInput`, `cast`                                    | Movement and combat intent; see movement design             |
| Client → server | `createScene`, `ready`, `joinScene`, `returnLobby`, `leaveScene` | Scene lifecycle with server-checked phase and proximity     |
| Client → server | `selectClass`, `chat`, `ping`                                    | Wardrobe, conversation and latency measurement              |
| Server → client | `worlds`, `joined`, `state`, `left`                              | Directory, session identity and full world snapshots        |
| Server → client | `saved`, `error`, `pong`                                         | Save acknowledgement, readable failure and ping correlation |

`WorldState` includes players, optional forest/training scene state, chat and server time. `joined` returns the bearer character key; routine state snapshots do not carry it. Scene serialization is explicit in [scenes.ts](../../packages/server/src/scenes.ts). Changing a wire field requires checking both serialization and client interpolation, not just the interface.

## Recovery lifecycle

Explicit leave removes membership and revokes automatic recovery. An interrupted connection instead clears input and retains its session/world state for 30 seconds. The client retries immediately, then at one-second intervals after repeated failures. Expired sessions are saved and removed on the five-second autosave sweep.

The browser keeps the character key in localStorage and the current world ID in per-tab sessionStorage. A resumed live session retains scene, vote and position. After process restart, persisted world authorization restores the character to that world's village; combat, chat and coordinates are not persisted. Recovery rejects missing worlds, unauthorized membership, a full world and another live session. Storage failures permit recovery within the current page but cannot guarantee recovery after reload.

On each connection, the client checks `version.json` before resuming gameplay. A mismatch reloads; invalid or failed checks retry. The build ID, cache policies and deployment ordering are described in [operations](../operations.md#deployment-and-cache-consistency).

## SQLite records and migration

[CharacterStore](../../packages/server/src/characters.ts) uses Node's built-in SQLite with WAL and full synchronous writes.

| Table           | Durable data                                                                        |
| --------------- | ----------------------------------------------------------------------------------- |
| `characters`    | UUID, unique SHA-256 token hash, name, validated progress JSON and update timestamp |
| `worlds`        | UUID, name, salt, optional password hash and permanent flag                         |
| `world_members` | Character ID and most recent authorized world ID                                    |

A key is 32 cryptographically random bytes encoded as 64 hex characters. Losing browser storage loses access; there is no account recovery. Raw keys are not stored in SQLite.

Legacy progress JSON decodes into Warrior; missing classes get fresh progress. Current saves encode the selected `classId` and per-class progress map. Validation preserves fractional XP and constrains finite, nonnegative values and HP/MP maxima. Switching class saves the proposed new state before mutating the live player. No schema migration or runtime save change is part of the documentation rollout.

## Failure and verification

Failed loads surface errors; failed saves are reported and retried rather than treated as successful. A shutdown saves sessions while preserving recoverable world records. An empty player-created world is removed; the permanent world keeps its UUID and resets temporary state.

Use [world tests](../../packages/server/src/worlds.test.ts), [character tests](../../packages/server/src/characters.test.ts), [reconnect tests](../../packages/server/src/reconnect.test.ts), [update recovery tests](../../packages/server/src/update-recovery.test.ts) and [chat tests](../../packages/server/src/chat.test.ts). Cover independent clients, cross-world isolation, wrong passwords, full capacity, duplicate credentials, token loss, restart recovery, explicit-leave revocation, class-save failure and fractional XP round trips. Browser recovery is covered in [reconnect.spec.ts](../../tests/reconnect.spec.ts).
