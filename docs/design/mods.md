# Core registries and bundled mods

Status: implemented architecture for [MOD-01–04](../specs/mods.md). The design
was accepted in documentation PR #169 before runtime implementation. Execution
evidence and remaining verification are recorded in the [plan](../plans/mods.md).

## Ownership and dependency direction

### Rolled gear instances

[ITEM-01–03](../specs/item-rolls.md) adds core-owned rarity/stat configuration
and weighted sampling. Common carries only structural optional `rarity`/`stats`
fields on inventory/drop instances. Existing equipped definition IDs remain;
optional `equipmentItems[slot]` retains the equipped instance and its rolls.
Core validates that each instance matches its slot's definition ID, allowed
stats, rarity count and configured exact values. Saves without instances retain
their old stats and Common presentation. Mod gear types without a configured
roll pool also remain unrolled Common until a pool is added. Equip, storage and trade move the
instance; they never regenerate it. Server commands still save before publishing.
Combat reads summed equipped bonuses, and the server binds the complete party
roster to reward generation independently of hit credit. Client/UI receive
rarity colors and stat descriptions from the host; common never imports core.

Core is the composition root for the playable game: it constructs registries,
loads bundled mods, validates content, prepares derived data and exposes shared
rules to host adapters. It remains portable TypeScript with no DOM, database,
HTTP server or renderer dependencies. Server owns authoritative scheduling,
Miniplex membership, transport, authentication and persistence. Client owns input,
prediction, PixiJS and presentation; UI remains controlled and game-independent.

The dependency direction is `server/client -> core -> common`, with server/client
also importing common contracts directly. Common contains serializable state,
content contract types, structural schemas, protocol projection, collection
membership and content-independent geometry. It must never import core, even
through a compatibility re-export. A common contract accepting a read-only data
argument is permitted; obtaining the global catalog from common is not.

Items discriminate gear from consumables: gear carries category/stats, while
consumables carry healing without unused gear fields. A definition describes a type. Mutable actors, inventory entries, cooldowns,
projectiles, progress and ECS membership remain instance state. Registries never
contain Pixi objects, Colyseus schemas, database rows or mutable character state.
Mod registration functions are executable TypeScript; registered content remains
plain serializable data. Engine implementations are separate from definitions.

## Content surface

[`content/create-game.ts`](../../packages/core/src/content/create-game.ts) owns
composition; [`content/contracts.ts`](../../packages/core/src/content/contracts.ts)
defines the registration/read APIs; [`content/rules.ts`](../../packages/core/src/content/rules.ts)
binds rules and semantic schemas. [`content/shapes.ts`](../../packages/core/src/content/shapes.ts)
and [`content/validate.ts`](../../packages/core/src/content/validate.ts) validate
content structure, supported families and cross-registry references. [`mods/base.mod.ts`](../../packages/core/src/mods/base.mod.ts)
registers shipped data from private `mods/base/` modules.
[`mods/index.ts`](../../packages/core/src/mods/index.ts) lists bundled modules and
[`game.ts`](../../packages/core/src/game.ts) initializes the default game.

| Registry or registered configuration               | Catalog views and consumers                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items, gear categories and slots                   | [Equipment definitions](../../packages/core/src/definitions/equipment.ts) and [inventory rules](../../packages/core/src/content/rules.ts); equipment validation, loot, trade, saves and equipment views                                                                                                                                        |
| Numeric stats                                      | `GearStats`, registered defaults and aggregation in [equipment rules](../../packages/core/src/content/rules.ts); character/companion totals, combat and displayed stats                                                                                                                                                                        |
| Classes                                            | [Players](../../packages/core/src/definitions/entities/players.ts); class selection, starters, saved class maps, ability selection and artwork                                                                                                                                                                                                 |
| Abilities and ailments                             | [Attacks](../../packages/core/src/definitions/abilities/attacks.ts), [ailments](../../packages/core/src/definitions/effects/ailments.ts); authoritative hits, projectile motion, prediction, debug drawing and tooltips                                                                                                                        |
| Enemies, spawn rules, types, bosses and difficulty | [Enemies](../../packages/core/src/definitions/entities/enemies.ts) and [balance configs](../../packages/core/src/configs); spawning, steering, attributes, hitboxes, rewards and health displays                                                                                                                                               |
| Companions and pickups                             | [Companions](../../packages/core/src/definitions/entities/companions.ts), [pickups](../../packages/core/src/definitions/entities/pickups.ts); current Bear and reward paths                                                                                                                                                                    |
| Encounters and worlds                              | [Forest encounter](../../packages/core/src/definitions/encounters/forest.ts), [training](../../packages/core/src/definitions/encounters/training.ts), [village](../../packages/core/src/definitions/worlds/village.ts), [forest](../../packages/core/src/definitions/worlds/forest.ts); scene setup, geometry, seeded scenery and interactions |
| Critters and transient effects                     | [Critters](../../packages/core/src/definitions/entities/critters.ts), [effects](../../packages/core/src/definitions/effects/transient.ts); client content consumers                                                                                                                                                                            |
| Defaults and rules                                 | [Runtime](../../packages/core/src/definitions/runtime.ts), [collision](../../packages/core/src/definitions/collision.ts), initial progress and spawn/drop policies; their existing consumers                                                                                                                                                   |

Singleton settings may be registered as named configuration entries rather than
inventing multiple interchangeable runtimes. Protocol mechanics and transport
message discriminants remain engine contracts, not mod extension points. Existing
`EnemyType` values still refer to `Enemy.kind`, while `EnemyKind` values still refer
to `Enemy.archetype`; do not swap those meanings during naming cleanup.

The base mod owns the authoritative values. Small supporting data modules may
keep it readable, but they are only consumed through base registration. Public compatibility constants in core derive from the initialized catalog;
they are not a second source of truth. Common no longer exports definition
subpaths or forwards to core.

## Registration and lifecycle

`createGame(mods)` returns a frozen ready context with `registries`, `rules`,
`modIds` and `status`. A bundled mod has a stable ID and a synchronous registration function receiving
a typed registration context. The registration context exposes only `register`; the read API exposes
`size`, `has`, `get`, `require`, `values` and `entries`. IDs are stable strings
and iteration follows registration order. The read API
exposed to gameplay omits mutation. Registration order is explicit and stable:
base first, followed by the configured bundled modules. No filesystem scanning,
network fetch or registration side effects on importing an individual mod.

1. **Create:** allocate fresh empty registries for one game composition.
2. **Load/register:** visit the explicit bundled module list and invoke each
   registration function once. Report duplicate mod IDs or duplicate registry
   IDs; no implicit last-writer-wins override. Forward references may be declared.
3. **Validate:** after every mod has registered, resolve references and validate
   data shapes, ranges and supported behaviors. Errors include mod ownership,
   registry, ID and offending field/reference.
4. **Initialize:** derive ordered class/slot lists, loot pools, lookup views,
   content-aware validators, world geometry and seeded scenery. Seal registration
   and prevent callers from mutating definitions through retained references.
5. **Start:** make the ready game context available to authoritative systems and
   client prediction/presentation; only then accept sessions or render gameplay.

Failure discards the unfinished context. The composition API supports fresh isolated instances for tests. The default
game uses this same path once at module initialization.
Consumers must not capture incomplete tables during an import cycle. Independent
composition binds its content-aware schemas, equipment and stat helpers to its
own catalog. Live simulation uses one immutable default game created from the
bundled list; this design does not require per-world mod selection or injecting
a separate catalog through every simulation function. Tests of added combat
content must exercise a composition used by those combat consumers, not quietly
call helpers closed over a different base-only catalog. No mutable global catalog
switching is introduced.

Server startup initializes before opening gameplay sessions and before
content-dependent save decode. Browser startup initializes before deriving
class images, slot lists or prediction helpers. Both bundles include the same
ordered modules; the existing deployment/build version checks remain the
compatibility mechanism. Per-session mod selection and a new negotiation protocol
are not part of this migration.

## Validation and stable contracts

Content shape definitions are grouped under `content/shapes` by content,
world and mechanic families, with shared scalar primitives. `validate.ts`
orders structural, equipment, ability/class, enemy, balance and world checks
from `content/validation`. A shared context retains mod ownership in errors;
the structural shape-group map preserves family order and unsupported-family
messages. Startup still rejects the complete composition on any failure.

Content IDs use open string contracts where extensibility requires it. Existing
constant objects can remain useful names for built-in IDs without defining a
closed universe. Slot IDs, class IDs, item IDs, numeric stat keys, enemy archetype
IDs and ability IDs must not be narrowed back to base-only unions in downstream
APIs. Closed engine discriminants for supported behavior families remain closed.

Shape validation is separate from content validation. Common can check finite numbers,
string bounds, array/object structure, unique instance IDs and protocol shape.
Core validates ID membership, item stackability, registered slot/category/class
compatibility, starters and other catalog-dependent rules. Server command and
save entrypoints must apply both layers before mutation. Widening `z.enum` to a
string without reinstating semantic validation is an incomplete migration.

Startup checks cover serializable finite data; unique IDs; registered stat keys;
slot/category references; class ability, ailment, companion and starter
references; starter compatibility; enemy/boss/encounter/world references; valid
ranges/timing; supported mechanic keys; and geometry invariants. Preserve the
current shared village/forest wrapping dimensions and deterministic scenery.
Validate display metadata or provide a documented generic fallback, rather than
requiring hardcoded UI maps for every new content ID.

`createCharacterPersistence(context)` in [characters.ts](../../packages/server/src/characters.ts)
binds save decode, class enumeration and repository helpers to a ready context.
Runtime save decode enumerates registered classes. Preserve version-1 to
version-2 Storehouse migration, per-class records, defaults, null/empty equipment
semantics and transaction ordering. Unknown definitions must produce an explicit
error without replacing or resaving the original data. Content removal and
renaming need a future migration policy; this change introduces neither a save
reset nor a new save version merely for moving definitions.

## Make registry data drive gameplay

[Class combat](../../packages/core/src/class-combat.ts) and
[simulation](../../packages/core/src/simulation.ts) resolve the registered class's
ability and optional companion, then dispatch by mechanic kind. Projectile
`kind` retains its existing wire meaning. Added abilities carry optional
`abilityId`; absent IDs resolve through the built-in `kind`, preserving old
payloads. Optional projectile `ailment` captures a nondefault class ailment at
launch; older arrow/fireball payloads retain poison/burn defaults. Roots requires
the roots ailment. Class `art` uses an existing player family; enemy `art` and `behavior`
are independent of their stable definition IDs. Selected combat/projectile,
enemy attribute and hitbox helpers accept an explicit context for fixture tests.

Supported ability families cover the current melee, piercing projectile,
splash projectile and bouncing roots behavior. Piercing must match the family
(arrow only). Registered melee duration and aim smoothing drive simulation and
client smoothing; weapon stats continue to determine attack cooldown. Enemy definitions select supported
melee or ranged behavior; movement/hitbox/attribute code reads registered enemy values and uses
`behavior` for ranged dispatch. Base spawn
probabilities, alternating choices, boss timing and random-roll order remain
unchanged. Additional enemies join spawning only through explicit `spawnRules`
entries with `id`, `enemy` and fractional `chance`. The total cannot exceed 1.
`spawnArchetype` uses one roll against cumulative ranges in registration order;
the remaining range selects `settings.spawnFallbacks` by spawn count. Base rules
reserve 0.1 each for Brute and Caster and alternate Runner/Skeleton otherwise.

Slots carry compatibility, labels and explicit grid coordinates. Equipment aggregation traverses
registered slots and initializes registered numeric stats before summing item
contributions. Built-in clamps and derived formulas, such as armor reduction and
attack interval, preserve their current behavior. New additive numeric stats can
be aggregated/displayed; a new effect of a stat still requires a rule consuming
it. Damage types and other nonnumeric metadata are not summed as stats.

Core owns content-dependent equipment/inventory helpers and semantic schemas.
[World helpers](../../packages/core/src/world.ts) derive paths and seeded trees;
[scene helpers](../../packages/core/src/scene.ts) bind world geometry/interactions;
[hitboxes](../../packages/core/src/hitboxes.ts) resolve enemy sizes. Pure wrapping
algorithms remain in [common geometry](../../packages/common/src/geometry.ts).
Content-derived views initialize after `game` is ready.

Client consumers read the initialized content: [class images](../../packages/client/src/characters.ts),
[class selection](../../packages/client/src/main.tsx), [equipment views](../../packages/client/src/equipment-view.tsx),
[action bar](../../packages/client/src/WeaponActionBar.tsx),
[prediction](../../packages/client/src/local-movement.ts),
[snapshots](../../packages/client/src/snapshots.ts), [forest rendering](../../packages/client/src/forest.ts),
[effects](../../packages/client/src/combat-effects.ts) and [debug hitboxes](../../packages/client/src/hitboxes.ts).
A new slot declares its grid position; a new class reuses a declared existing
art family. [Pure content views](../../packages/client/src/content-views.ts)
derive slot positions/fallback icons and added numeric stat rows; loot icons
reuse the same fallback for added slots. Debug melee overlays resolve ability
kind rather than a built-in class name. EquipmentPanel
grows to the supplied coordinates, retaining a minimum three-column/four-row
layout. Class `details` supplies descriptions from base content or uses generic
text when omitted; labels and supported ability descriptions resolve from content
or mechanic metadata. UI receives these as controlled views and gains no
core dependency. New art pipelines remain separate implementation work. The
[core guide](../../packages/core/README.md#add-a-bundled-mod) contains a standalone
registration example and explains how to avoid importing default-game views from
a bundled mod.

## Scope and verification

Core owns content composition and game rules; it does not become an HTTP server,
SQLite repository, Pixi renderer or universal scripting engine. Existing scene states, one Bear slot, the four ailment identities, three enemy
types, three difficulty identities, pickup/effect/critter identities, entity
collections and action-bar reserved slots remain fixed. Startup rejects unsupported identities in those families. Registries make supported content extensible; additional
mechanics or structural game modes require explicit contracts and implementation.

The [plan](../plans/mods.md#verification) requires base regression tests and an
additional bundled fixture reaching real runtime consumers. Successful registry
lookup alone does not establish extensibility. The migration preserves gameplay; it makes no performance improvement claim.
