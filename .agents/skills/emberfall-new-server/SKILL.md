---
name: emberfall-new-server
description: Develop or test Emberfall server-new Miniplex lifecycle, Colyseus sessions, replication and SQLite saves. Excludes visual-only client work and changes confined to the original server.
---

# New server systems and persistence

Read the [server-new guide](../../../packages/server-new/README.md), its AGENTS,
and the [runtime design](../../../docs/design/new-runtime.md).

Keep Miniplex authoritative, Colyseus a projection, and persistence behind the
repository. Derive identity from the authenticated session. Preserve command
validation, Origin checks, rate limits, bounded input duration and area epochs.
Keep world/scene membership changes ordered and remove retired ECS components.

Distinguish explicit leave, temporary reconnect and process restart. A private
Colyseus session room connects to the shared party simulation; it does not own
a duplicate world. Test transfers and live-character takeover protection.

Validate save documents, retain revision conflict checks, and commit class
changes before mutating live state. Read legacy backups only through the importer
into a new destination; never test on live player data or expose bearer keys.
Dependency upgrades must verify the Colyseus table contract and service interop.

Run affected native SDK, schema, ECS and persistence tests using disposable
databases. Include rejection/retry paths and restart evidence. Build and run
affected browser scenarios when the visible session flow changes. Update docs
for migration, ownership or operational changes and report checks actually run.
