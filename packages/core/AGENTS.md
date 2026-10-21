# Core content and rules

Read [the package guide](README.md), [mod design](../../docs/design/mods.md) and
the relevant gameplay spec. Core owns registries, bundled mods, content-aware
validation and shared rules; it depends on common, never the reverse.

Register shipped content through `src/mods/base.mod.ts` and additional modules
through the explicit `src/mods/index.ts` list. Definition views are derived from
the ready catalog. Do not import the default game or its views inside a bundled
mod. Keep definitions serializable and immutable, instance state mutable and
presentation/transport/persistence outside core. Preserve stable saved/wire IDs,
base values, wrapped geometry, forest/training parity and server authority.

Use the existing mechanic/art families or explicitly implement and validate a
new family. Registry lookup alone does not prove extension: cover real rule,
command/save and presentation consumers. Use fresh `createGame` contexts for
fixtures and bound helpers without mutable global switching. Run core package
checks and the affected server/prediction suites; report actual evidence.
