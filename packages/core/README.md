# Core library

`@emberfall/core` is the home for shared game configuration and reusable game
logic utilities, combat, enemies and training. The server uses its authoritative
combat kernels; client prediction and health displays reuse the same helpers.

## Registries, mods and startup

Core is the composition root for portable game rules and content. Common supplies
contracts, structural schemas and pure geometry; common never imports core.
`createGame(mods)` creates registries, invokes synchronous registration, validates
references/values, seals content and returns a ready context with `registries`,
`rules`, `modIds` and `status`. Failed startup exposes no partially ready context.
The default `game` uses the explicit `GAME_MODS` list in `src/mods/index.ts`, with
`baseMod` first. Both server and browser initialize that list before gameplay.

`src/mods/base.mod.ts` registers shipped content from its private `base/` data
modules. `src/definitions` and balance configs expose derived views for consumers;
edit source content through the mod, not these views. `src/content` owns registry
contracts, validation and bound equipment/inventory rules. World helpers,
hitboxes, combat, enemies and training live in core. Export APIs from `src/index.ts`
or the declared definition/hitbox subpaths. The [design](../../docs/design/mods.md)
describes ownership, saved IDs, supported mechanics and validation boundaries.

Registries expose `size`, `has`, `get`, `require`, `values` and `entries`.
Registration receives only `register` for each registry. Definitions are copied
and deeply frozen, IDs cannot overwrite earlier entries, and retained registration
handles close even after failure. Do not import the default `game`, its derived
views or the root core barrel inside a bundled mod: that creates a composition
cycle. Import `GameMod` as a type from `../content/contracts.ts`, and use plain
standalone data or shared mod-owned templates.

`ItemDefinition` is a discriminated union. Gear uses `kind: 'gear'` with
`gearType` and `stats`; consumables use `kind: 'consumable'` with `healing`.
Resources use `kind: 'resource'` and stack to 200; gear never stacks. Consumables need no dummy gear fields. `BaseItemDefinition` carries `id`, `name`
and optional `price` (a safe nonnegative integer in gold units). `EnemyKind` is an open string type while the named built-in
constants retain their original values.

## Add a bundled mod

This example adds a numeric stat, a slot/item, a class/ability and an enemy using
existing engine and art families. Save it as `src/mods/example.mod.ts`, then import
it in `src/mods/index.ts` and append it after `baseMod` in `GAME_MODS`. It is an
authoring example, not content enabled in the shipped game.

```ts
import type { GameMod } from '../content/contracts.ts';

export const exampleMod: GameMod = {
  id: 'example',
  register(r) {
    r.stats.register({
      id: 'example:luck',
      label: 'Luck',
      default: 0,
      aggregation: 'sum',
      format: 'number',
    });
    r.slots.register({
      id: 'example:charm',
      label: 'Charm',
      gearTypes: ['amulet'],
      column: 4,
      row: 1,
    });
    r.items.register({
      id: 'example:charm',
      name: 'Lucky charm',
      kind: 'gear',
      gearType: 'amulet',
      stats: { 'example:luck': 2 },
      price: 1,
    });
    r.abilities.register({
      id: 'example:arrow',
      kind: 'arrow',
      range: 1000,
      manualRange: 1000,
      damage: 5,
      intervalMs: 1000,
      durationMs: 260,
      aimSmoothingSeconds: 0.08,
      speed: 500,
      count: 1,
      spreadRadians: 0,
      piercing: true,
      splashRadius: 0,
      splashDamage: 0,
      bounces: 0,
      bounceRadius: 0,
    });
    r.classes.register({
      id: 'example:scout',
      label: 'Scout',
      attack: 'example:arrow',
      ailment: 'poison',
      art: 'ranger',
      sprite: '/assets/ranger.png',
      starterWeapon: 'ranger-bow',
      gearTypes: ['bow', 'quiver'],
    });
    r.enemies.register({
      id: 'example:runner',
      behavior: 'melee',
      art: 'runner',
      speed: 90,
      radius: 8,
      size: 32,
      reach: 32,
      windup: 500,
      cooldown: 900,
      hitPoints: 15,
      damage: 3,
    });
    r.spawnRules.register({ id: 'example:runner', enemy: 'example:runner', chance: 0.1 });
  },
};
```

References can point to earlier or later registered definitions; validation runs
after every mod registers. Slots require explicit positive grid coordinates.
Stats sum numeric contributions and appear in `characterStats(player).attributes`;
new stat effects need engine rules. Item `loot: true` opts into the existing gear
loot pool; registration alone does not put an item in inventory. Enemy registration alone does not change spawn composition. A `spawnRules`
entry references the enemy and assigns a fraction from 0 to 1. The sum of
registered chances cannot exceed 1. `spawnArchetype` checks cumulative ranges in
registration order using one roll, then alternates the registered
`spawnFallbacks`. Base rules reserve 0.1 each for Brute and Caster; the example
adds a 0.1 range without changing those ranges.
Classes reuse one of four art families; ability kinds are `slash`, `arrow`,
`fireball` and `roots`; enemy behaviors are `melee` and `ranged`. Arrow is piercing; other ability families are non-piercing. Roots abilities
and the roots ailment must be selected together. Class `details` optionally
provides weapon/spell labels and descriptions; omitted details use generic text.
Ailment, pickup, effect and critter identities, one Bear companion, scene families
and difficulty/type identities remain fixed.

For isolated tests call `createGame([baseMod, exampleMod])` and use that context's
`rules`. Selected combat helpers accept a context explicitly; live startup uses
the immutable default game. Server `createCharacterPersistence(context)` binds
save validation and class enumeration to the same context. Do not switch a global
catalog or assume every default-world helper accepts a custom context. Preserve
existing saved/wire IDs and use the [extension checks](../../docs/plans/mods.md#verification).

## Balance configs

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
node IDs. See [PROG-03](../../docs/specs/progression.md#prog-03--talents).
