# Core library

`@emberfall/core` is the home for shared game configuration and reusable game
logic utilities, combat, enemies and training. The server uses its authoritative
combat kernels; client prediction and health displays reuse the same helpers.

Read only the topic needed for the current task. Each linked page owns its detailed guidance.

## Registries, mods and startup

See [Registries, mods and startup](docs/registries.md#registries-mods-and-startup).

## Add a bundled mod

See [Add a bundled mod](docs/authoring.md#add-a-bundled-mod).

## Balance configs

See [Balance configuration and utilities](docs/rules.md#balance-configs).

## Utilities

See [Balance configuration and utilities](docs/rules.md#utilities).

## Dimension variants

The bundled `dimensions` mod adds Swamp and Desert after base content. Use
`dimensionDefinition(id, context)` for catalog-bound modifiers, enemy pools,
bosses and resources. The optional scene/player dimension preserves existing
forest wire/save compatibility. Enemy skills support marked ground attacks and
bounded volleys; see [SCENE-07](../../docs/specs/scenes/forest.md#scene-07--dimensions)
and the [simulation design](../../docs/design/simulation.md#dimension-variants).
