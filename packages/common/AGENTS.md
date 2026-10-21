# Shared contracts

Read [the package guide](README.md) and the relevant gameplay spec.
Keep common independent of core. Put content registration, semantic validation,
equipment/inventory rules and bound world helpers in core; keep structural
schemas, portable state/contracts and pure geometry here. A valid string ID does
not prove registry membership. Preserve wire/save shapes and collection membership
semantics for authoritative ECS and prediction snapshots. Run affected contract,
protocol and geometry tests and report actual checks.
