# Core library

`@emberfall/core` is the home for shared game configuration and reusable game
logic utilities, combat, enemies and training. The server uses its authoritative
combat kernels; client prediction and health displays reuse the same helpers.

## Accepted mod architecture

The [bundled mod design](../../docs/design/mods.md) and
[implementation plan](../../docs/plans/mods.md) are accepted upcoming work.
Core will own registries, the explicit bundled mod list and the lifecycle from
registration through validation/initialization to playable rules. Current content
will be registered by `src/mods/base.mod.ts`; existing balance exports become
derived catalog views. Content-aware equipment, inventory and geometry wrappers
will move here from common. The sections below describe the implemented baseline
until that runtime migration lands. Common must remain independent of core.

## Package boundary and balance configs

Shared enums belong in `common/src/enums`, exported from `@emberfall/common`
and the lightweight `@emberfall/common/enums` entrypoint. They use `as const`
objects and matching value types so Node 24 can execute the source directly.
Core depends on common; common must never depend on or import core.
Reusable game utilities belong in `core/src/utils`, and balance configs in
`core/src/configs`. Combat, enemies, training and their client prediction helpers
live in core; enums, state, geometry and portable content definitions stay in common.

Each balance table has its own `.ts` file and is exported from core:

| Config                           | Values                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| `itemDropChance`                 | Normal 4%, Elite 15%, Boss 50%                                   |
| `itemCountDropPercent`           | Normal 1, Elite 50–150%, Boss 100–500%                           |
| `enemyTypeSpawnChance`           | Check Elite 5% first, then Normal 100%; bosses use a timer       |
| `enemyKindAttribute`             | Skeleton and Runner 10 HP / 3 damage, Brute 30 / 9, Caster 7 / 3 |
| `enemyTypeAttributesMultiplier`  | Normal 1, Elite 3, Boss 10                                       |
| `difficultyAttributesMultiplier` | Easy 1, Medium 2, Hard 4                                         |

Runner, Brute and Caster base attributes are initial config values using the
existing archetypes and HP proportions. These tables now drive live combat and
loot through the utilities below. The village still offers Easy only.
`EnemyType` maps to the existing `Enemy.kind` field, while `EnemyKind` maps to
`Enemy.archetype`, preserving wire IDs.

Count percentages use `isMultiChanced`: 350% yields three guaranteed items and
a 50% chance of a fourth. The requested Normal value is retained as `1` (1%
under this percentage convention). Range endpoints describe percentages;
`itemDropCount(type)` rolls an inclusive integer percentage within the range
before calling `isMultiChanced`. `shouldDropItem(type)` is the independent drop
gate, checked before rolling counts. `spawnEnemyType()` checks entries in order,
while the authoritative boss timer bypasses that utility.

`enemyAttributes(kind, type, difficulty)` returns base HP and damage scaled by
`enemyTypeMultiplier(type)` and `difficultyMultiplier(difficulty)`. Party scaling
then applies to HP only. `enemyMaxHealth` prefers confirmed max HP, preserving
training and party values; it uses the same attribute utility as a fallback.
Enemy projectiles carry launch-time damage, so killing a shooter cannot change
an in-flight attack. The client never rolls spawns or rewards.

## Utilities

Keep configuration and utilities usable by both the browser and server, without
DOM access, Node-specific APIs, transport, persistence or presentation dependencies.

Export public APIs from `src/index.ts`. Consumers should declare
`"@emberfall/core": "workspace:*"` in their dependencies and import from
`@emberfall/core`.

Like the existing common libraries, this private workspace package exports
TypeScript source directly for Node 24 and Vite; it needs no separate build.

`isChanced(percent)` returns whether a random roll triggers the given percentage.
For example, `isChanced(25)` has a 25% chance of returning `true`. Fractional
percentages are supported. Values at or below 0 always return `false`, values at
or above 100 always return `true`, and `NaN` returns `false`.

`isMultiChanced(percent)` returns the number of triggered events: each full 100%
guarantees one event, and the remaining percentage rolls for one more. For
example, `isMultiChanced(150)` returns 1 or 2 with equal probability. Values at
or below 0 and `NaN` return 0; `Infinity` returns `Infinity`.

`levelUp({ level, experience, paragon? })` returns a fresh object containing
`level`, unspent `experience`, and `paragon` (default 0), applying as many
level-ups as the experience allows. Levels start at 1 and stop at 20; further
level-ups increase paragon without a cap. The next level-up costs
`50 * 2 ** (level + paragon - 1)`: 50, 100, 200, and so on, continuing the curve
into paragon. Callers supply valid levels, nonnegative paragon integers and
finite nonnegative experience; inputs are not validated. Fractional experience
is supported. The server applies this utility after combat rewards; level,
paragon and unspent XP use the existing per-class save lifecycle.
`experienceRequired(level, paragon = 0)` exposes the same next-level cost for
the client's confirmed XP display.

These utilities live in `src/utils` and are exported from `@emberfall/core`.

Run `pnpm --filter @emberfall/core typecheck` and
`pnpm --filter @emberfall/core test` from the repository root.
