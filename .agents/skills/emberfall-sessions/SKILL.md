---
name: emberfall-sessions
description: Change Emberfall world membership, reconnects, build recovery, chat or character persistence. Excludes combat balancing and presentation-only work.
---

# Change Emberfall sessions and saves

Read the affected [world/chat](../../../docs/specs/worlds-and-chat.md) or [character](../../../docs/specs/characters.md) requirement and [network/persistence design](../../../docs/design/network-and-persistence.md).

Trace the shared message schema, `worlds.ts` handler, `CharacterStore` and client connection flow relevant to the request. Update the existing spec/design for changed behavior.

- Derive identity and world membership from the session. Keep schema, capacity, Origin, password and rate validation at the boundary.
- Distinguish explicit leave, temporary disconnect and process restart. Preserve the permanent world UUID and authorized recovery; reject duplicate live character sessions.
- Treat browser bearer keys as credentials. Never log raw keys or copy a real save into a test artifact.
- Validate progress before writing; preserve old class saves and fractional XP. Class selection must save before live mutation.
- For client updates, keep build ID checking, HTML/version cache policy and world recovery coordinated. A reload must not create a second player.
- Chat remains world-scoped and temporary; system messages must not consume a player's cooldown or replace their speech bubble.

Verify with the relevant world, character, reconnect, update-recovery or chat Node tests. Use temporary/in-memory SQLite and independent browser contexts for recovery scenarios; never test against live player data. Include the relevant failure path, not only a successful join or save. See [development](../../../docs/development.md) and [operations](../../../docs/operations.md).

Report compatibility/migration effects and actual restart/recovery evidence separately from a simple launch.
