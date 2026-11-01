# Balance configuration and utilities

[Back to Core library](../README.md).

Code paths in this guide are relative to `packages/core` unless prefixed with another package or repository directory.

## Balance configs

Item roll configuration is exported through `item-stats.ts`, with enums in
`src/enums/items.ts` and each balance map in `src/configs`. See
[ITEM-01–03](../../../docs/specs/item-rolls.md) for allowed stats, weights, exact
values and party-wide reward rolls. `rules.rollItem(id)` generates server-owned
instances. Inventory entries and optional `equipmentItems[slot]` retain rolls;
`characterStats(player).bonuses` exposes summed affixes separately from intrinsic
attributes. Missing metadata preserves existing stats and means Common.

Each balance table has its own `.ts` file and is exported from core:

| Config                           | Values                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| `itemDropChance`                 | Normal 4%, Elite 15%, Boss 50%                                   |
| `itemCountDropPercent`           | Normal 1, Elite 50–150%, Boss 100–500%                           |
| `enemyTypeSpawnChance`           | Check Elite 5% first, then Normal 100%; bosses use a timer       |
| `enemyKindAttribute`             | Skeleton and Runner 10 HP / 3 damage, Brute 30 / 9, Caster 7 / 3 |
| `enemyTypeAttributesMultiplier`  | Normal 1, Elite 3, Boss 10                                       |
| `difficultySpeedMultiplier`      | Easy 1, Medium 1.05, Hard 1.15                                   |
| `difficultyAttributesMultiplier` | Easy 1, Medium 2, Hard 4                                         |
| `zoneRarityMultiplier`           | Forest 1                                                         |
| `difficultyRarityMultiplier`     | Easy 1, Medium 1.5, Hard 2                                       |

Combat gear uses `zoneRarityMultiplier[scene.type] *
difficultyRarityMultiplier[scene.difficulty]`. `rollItem(id, random, rarityMultiplier)`
passes this product to `rollRarity(random, multiplier)`, scaling non-Common
chances while Common fills the remainder. Both optional arguments preserve
base odds by default, including merchant stock. These maps are separate from
enemy strength, item drop gates and item counts.

`enemyKindAttribute` also exposes base movement speed in world units per second:
Skeleton 64, Runner 104, Brute 40 and Caster 54. Movement applies the registered
`difficultySpeedMultiplier` independently of HP/damage and enemy type, then
applies any roots slow.

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

Class talent names and column identities live in `talent-catalog.ts`; point,
rank, loadout and migration rules live in `talent-tree.ts`. `talent-effects.ts`
owns authoritative triggered and scheduled effects; `talent-combat.ts` validates
equipped casts. `talent-description.ts` supplies rank tooltips. Talents never
contribute permanent values to `characterStats`. Registered talent ability
indices run from 0 to 11 per class; four saved action slots reference learned
node IDs. See [PROG-03](../../../docs/specs/progression.md#prog-03--talents).
