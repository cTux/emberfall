# Registered content surface

[Back to Core registries and bundled mods](../mods.md).

## Content surface

[`content/create-game.ts`](../../../packages/core/src/content/create-game.ts) owns
composition; [`content/contracts.ts`](../../../packages/core/src/content/contracts.ts)
defines the registration/read APIs; [`content/rules.ts`](../../../packages/core/src/content/rules.ts)
binds rules and semantic schemas. [`content/shapes.ts`](../../../packages/core/src/content/shapes.ts)
and [`content/validate.ts`](../../../packages/core/src/content/validate.ts) validate
content structure, supported families and cross-registry references. [`mods/base.mod.ts`](../../../packages/core/src/mods/base.mod.ts)
registers shipped data from private `mods/base/` modules.
[`mods/index.ts`](../../../packages/core/src/mods/index.ts) lists bundled modules and
[`game.ts`](../../../packages/core/src/game.ts) initializes the default game.

| Registry or registered configuration               | Catalog views and consumers                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items, gear categories and slots                   | [Equipment definitions](../../../packages/core/src/definitions/equipment.ts) and [inventory rules](../../../packages/core/src/content/rules.ts); equipment validation, loot, trade, saves and equipment views                                                                                                                                              |
| Numeric stats                                      | `GearStats`, registered defaults and aggregation in [equipment rules](../../../packages/core/src/content/rules.ts); character/companion totals, combat and displayed stats                                                                                                                                                                                 |
| Classes                                            | [Players](../../../packages/core/src/definitions/entities/players.ts); class selection, starters, saved class maps, ability selection and artwork                                                                                                                                                                                                          |
| Abilities and ailments                             | [Attacks](../../../packages/core/src/definitions/abilities/attacks.ts), [ailments](../../../packages/core/src/definitions/effects/ailments.ts); authoritative hits, projectile motion, prediction, debug drawing and tooltips                                                                                                                              |
| Enemies, spawn rules, types, bosses and difficulty | [Enemies](../../../packages/core/src/definitions/entities/enemies.ts) and [balance configs](../../../packages/core/src/configs); spawning, steering, attributes, hitboxes, rewards and health displays                                                                                                                                                     |
| Companions and pickups                             | [Companions](../../../packages/core/src/definitions/entities/companions.ts), [pickups](../../../packages/core/src/definitions/entities/pickups.ts); current Bear and reward paths                                                                                                                                                                          |
| Encounters and worlds                              | [Forest encounter](../../../packages/core/src/definitions/encounters/forest.ts), [training](../../../packages/core/src/definitions/encounters/training.ts), [village](../../../packages/core/src/definitions/worlds/village.ts), [forest](../../../packages/core/src/definitions/worlds/forest.ts); scene setup, geometry, seeded scenery and interactions |
| Critters and transient effects                     | [Critters](../../../packages/core/src/definitions/entities/critters.ts), [effects](../../../packages/core/src/definitions/effects/transient.ts); client content consumers                                                                                                                                                                                  |
| Defaults and rules                                 | [Runtime](../../../packages/core/src/definitions/runtime.ts), [collision](../../../packages/core/src/definitions/collision.ts), initial progress and spawn/drop policies; their existing consumers                                                                                                                                                         |

Singleton settings may be registered as named configuration entries rather than
inventing multiple interchangeable runtimes. Protocol mechanics and transport
message discriminants remain engine contracts, not mod extension points. Existing
`EnemyType` values still refer to `Enemy.kind`, while `EnemyKind` values still refer
to `Enemy.archetype`; do not swap those meanings during naming cleanup.

The base mod owns the authoritative values. Small supporting data modules may
keep it readable, but they are only consumed through base registration. Public compatibility constants in core derive from the initialized catalog;
they are not a second source of truth. Common no longer exports definition
subpaths or forwards to core.
