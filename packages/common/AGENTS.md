# Shared rules and contracts

- Read the affected [spec](../../docs/README.md) and [simulation](../../docs/design/simulation.md) or [movement](../../docs/design/movement.md) design.
- Shared TypeScript is consumed by both Node and Vite. Keep browser-incompatible APIs out of common.
- Validate wire input with the shared Zod schema and update server/client consumers together. A shared type alone is not server validation.
- Use wrapped distances for both areas. Player pass-through and enemy/Bear tree avoidance are distinct rules.
- Route forest and training damage through the same combat functions. Preserve reward ownership, fractional XP and per-swing/cast deduplication.
- Verify relevant Node tests under `packages/server/src`; add browser evidence only when the changed contract affects visible prediction or controls.
