# Shared new-runtime rules and definitions

This package is independent of `common`, `client`, and `server`. It contains no
DOM access, database connection, or server transport. Both new runtimes import
the same movement, wrapping, targeting, projectile, and combat rules.

## Where things belong

| Location                                                                        | Responsibility                                                    |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/definitions/entities`                                                      | Classes, enemy archetypes, companion and pickup definitions       |
| `src/definitions/abilities`                                                     | Ranges, damage, cadence, projectile speeds and spread             |
| `src/definitions/effects`                                                       | Ailment stacking and duration rules                               |
| `src/definitions/encounters`                                                    | Training layout and regeneration                                  |
| `src/definitions/worlds`                                                        | World dimensions, landmarks, paths, spawn and return locations    |
| `src/definitions/runtime.ts`                                                    | Shared runtime defaults                                           |
| `src/index.ts`, `src/scene.ts`                                                  | Validated commands and plain runtime state types                  |
| `src/simulation.ts`, `src/class-combat.ts`, `src/enemies.ts`, `src/training.ts` | Shared simulation systems                                         |
| `src/entities.ts`                                                               | Collection membership boundary used by ECS and ordinary snapshots |
| `src/protocol/state.ts`                                                         | Colyseus projection and detached snapshot reconstruction          |

Definitions are plain serializable objects. Keys/IDs name types; live entities
have their own IDs, position, health, deadlines and ownership. Do not place
functions, Pixi objects, schema instances, mutable progress, or database rows
inside a definition. Geometry algorithms and behavior belong in systems.

## Develop and reuse

Start a content change in the relevant definition. Keep its current values when
porting an existing feature. Add behavior to the appropriate shared system and
use the same system for forest and training. Add presentation separately in
`client-new`; server commands decide whether an action is allowed.

Use public imports from `@emberfall/common-new` and
`@emberfall/common-new/definitions/entities/players` (or another definition
subpath). Import `@emberfall/common-new/protocol` only at network boundaries so
ordinary simulation consumers need not load the schema runtime.

Collection additions use `appendSceneEntities(scene, key, ...values)`; removals
replace the array with a filtered array. Mutate the entity's fields directly.
The server supplies read-only ordered ECS query views for collections, while
prediction and tests can supply ordinary plain objects. Never mutate collection
membership with `push`, `splice`, or index assignment in a shared system.

## Verify

Equipment content lives in `definitions/equipment.ts`: slot-to-gear compatibility,
class-specific weapon/off-hand categories and starter IDs. Character progress stores
equipped IDs per class. `equipment.ts` validates compatibility and derives totals
across every slot. Combat, prediction and UI use those totals; adding an item must
not introduce another balance table. Critical damage rolls only in the server's
weapon-hit path. Legacy missing loadouts receive starters; explicit empty loadouts
remain unarmed.

From the repository root: `pnpm typecheck-new`, `pnpm test-new`, and
`pnpm build-new`. Focused Node tests live under `packages/server-new/src` and
cover shared kernels, client prediction, ECS equivalence, and protocol patches.
Run affected browser scenarios with `pnpm test:browser-new` after building.

See the [runtime design](../../docs/design/new-runtime.md),
[combat requirements](../../docs/specs/combat.md), and
[progression constraints](../../docs/specs/progression.md). This migration does
not select a new progression system.
