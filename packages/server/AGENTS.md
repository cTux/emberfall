# Server instructions

- Read [network/persistence](../../docs/design/network-and-persistence.md) or [simulation](../../docs/design/simulation.md) for the affected behavior.
- Treat client commands as intent. Derive identity/world from the authenticated session; keep proximity, life, phase, cooldown and payload validation server-side.
- Preserve explicit-leave versus interrupted-session semantics and permanent-world identity. Restart recovery restores the village, not a serialized combat scene.
- Validate progress before saving; class switches save before live mutation. Test old save decoding and fractional XP when touching persistence.
- Use in-memory or temporary SQLite for tests. Do not inspect or migrate a player's live save to test a code change.
- Drive combat/deadline tests with explicit timestamps. This package also hosts tests of common/client pure helpers; a test's location does not imply server-only ownership.
