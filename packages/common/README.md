# Shared contracts and geometry

Common contains serializable entity/content types, structural Zod schemas,
content-independent geometry, collection membership and protocol projection.
It has no DOM access, database connection, server transport or dependency on core.
Game content, semantic validation and shared rules live in [core](../core/README.md).

## Where things belong

| Location                                              | Responsibility                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `src/content.ts`                                      | Open class/slot/item-related contracts and fixed damage type fields |
| `src/enums`                                           | Named built-in enemy type/kind and difficulty values                |
| `src/index.ts`                                        | Public compatibility exports                                        |
| `src/progress.ts`, `src/commands.ts`                  | Structural progress and client command schemas                      |
| `src/player.ts`, `src/world-state.ts`, `src/scene.ts` | Mutable player, world and scene contracts                           |
| `src/equipment.ts`, `src/inventory.ts`                | Structural inventory/equipment schemas and portable types           |
| `src/geometry.ts`, `src/world.ts`                     | Pure wrap/delta algorithms and scenery types                        |
| `src/entities.ts`                                     | Collection membership boundary for ECS and ordinary snapshots       |
| `src/protocol/state.ts`                               | Colyseus projection and detached snapshot reconstruction            |

Content IDs are strings where registration is extensible. A structurally valid ID
is not necessarily registered. Server command/save boundaries also use core's
catalog-aware schemas and rules. Never restore base-only enums or item lookup
refinements here, and never re-export core as a compatibility shortcut.

## Develop and reuse

Import contracts from `@emberfall/common`, built-in named values from
`@emberfall/common/enums`, and protocol adapters from `@emberfall/common/protocol`
only at network boundaries. Register content through core's bundled mod API;
`@emberfall/common/definitions/*` is no longer an entrypoint. Core owns bound
world geometry, hitboxes, equipment/inventory rules and forest/training simulation.

Definitions describe immutable types; entity instances retain mutable IDs,
position, health, deadlines and ownership. Collection additions use
`appendSceneEntities(scene, key, ...values)`; removals replace the array with a
filtered array. Mutate entity fields directly. Server collections are read-only
ordered ECS query views; prediction/tests can supply ordinary objects. Do not
change collection membership with `push`, `splice` or index assignment in a
shared system.

## Verify

Run affected contract/protocol/geometry tests and `pnpm typecheck`. Content changes
also need core's package tests and relevant server rules/save checks. See
[mod verification](../../docs/plans/mods.md#verification),
[runtime design](../../docs/design/new-runtime.md),
[combat](../../docs/specs/combat.md) and [progression](../../docs/specs/progression.md).
