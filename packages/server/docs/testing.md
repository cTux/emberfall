# Extend and test the server

[Back to Authoritative game server](../README.md).

Code paths in this guide are relative to `packages/server` unless prefixed with another package or repository directory.

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
test-only HTTP endpoints. See [development](../../../docs/development.md) and the
[runtime design](../../../docs/design/new-runtime.md).

`pnpm benchmark:runtime` runs isolated multi-world SDK load measurements against
the production server factory with temporary on-disk SQLite. Read the
[methodology and results](../../../docs/benchmarks/runtime.md) before interpreting
CPU, transport output or observed state cadence as a capacity estimate.
