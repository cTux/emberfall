# Core registries and bundled mods

Status: accepted upcoming design. This document defines the implementation target
for [MOD-01–04](../specs/mods.md). The first PR contains documentation only and must
merge before runtime implementation begins. Current source links below identify
migration seams, not already delivered registry APIs.

## Ownership and dependency direction

Core becomes the composition root for the playable game: it constructs registries,
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

A definition describes a type. Mutable actors, inventory entries, cooldowns,
projectiles, progress and ECS membership remain instance state. Registries never
contain Pixi objects, Colyseus schemas, database rows or mutable character state.
Mod registration functions are executable TypeScript; registered content remains
plain serializable data. Engine implementations are separate from definitions.

## Content surface

Proposed source homes are `core/src/content/` for contracts/registries and
validation, `core/src/mods/base.mod.ts` for the shipped mod, an explicit `core/src/mods/index.ts` bundled module list, and a core runtime
composition entrypoint. Exact helper filenames may change during implementation;
the package ownership and lifecycle are the contract.

| Registry or registered configuration        | Existing source and required consumers                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Items, gear categories and slots            | [Equipment definitions](../../packages/common/src/definitions/equipment.ts) and [inventory](../../packages/common/src/inventory.ts); equipment validation, loot, trade, saves and equipment views                                                                                                                                                      |
| Numeric stats                               | Current `GearStats`, `INNATE_STATS` and aggregation in [equipment](../../packages/common/src/equipment.ts); character/companion totals, combat and displayed stats                                                                                                                                                                                     |
| Classes                                     | [Players](../../packages/common/src/definitions/entities/players.ts); class selection, starters, saved class maps, ability selection and artwork                                                                                                                                                                                                       |
| Abilities and ailments                      | [Attacks](../../packages/common/src/definitions/abilities/attacks.ts), [ailments](../../packages/common/src/definitions/effects/ailments.ts); authoritative hits, projectile motion, prediction, debug drawing and tooltips                                                                                                                            |
| Enemies, enemy types, bosses and difficulty | [Enemies](../../packages/common/src/definitions/entities/enemies.ts) and [balance configs](../../packages/core/src/configs); spawning, steering, attributes, hitboxes, rewards and health displays                                                                                                                                                     |
| Companions and pickups                      | [Companions](../../packages/common/src/definitions/entities/companions.ts), [pickups](../../packages/common/src/definitions/entities/pickups.ts); current Bear and reward paths                                                                                                                                                                        |
| Encounters and worlds                       | [Forest encounter](../../packages/common/src/definitions/encounters/forest.ts), [training](../../packages/common/src/definitions/encounters/training.ts), [village](../../packages/common/src/definitions/worlds/village.ts), [forest](../../packages/common/src/definitions/worlds/forest.ts); scene setup, geometry, seeded scenery and interactions |
| Critters and transient effects              | [Critters](../../packages/common/src/definitions/entities/critters.ts), [effects](../../packages/common/src/definitions/effects/transient.ts); client content consumers                                                                                                                                                                                |
| Defaults and rules                          | [Runtime](../../packages/common/src/definitions/runtime.ts), [collision](../../packages/common/src/definitions/collision.ts), initial progress and spawn/drop policies; their existing consumers                                                                                                                                                       |

Singleton settings may be registered as named configuration entries rather than
inventing multiple interchangeable runtimes. Protocol mechanics and transport
message discriminants remain engine contracts, not mod extension points. Existing
`EnemyType` values still refer to `Enemy.kind`, while `EnemyKind` values still refer
to `Enemy.archetype`; do not swap those meanings during naming cleanup.

The base mod owns the authoritative values. Small supporting data modules may
keep it readable, but they are only consumed through base registration. Public
legacy constants, when retained in core, are read-only views derived from the
initialized catalog, not a second source of truth. Common's old definition
subpaths cannot forward into core; internal callers must migrate together.

## Registration and lifecycle

A bundled mod has a stable ID and a synchronous registration function receiving
a typed registration context. A registry supports registration by stable string
ID, required lookup, optional lookup and deterministic iteration. The read API
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

Failure discards the unfinished context. The composition API must support fresh
isolated instances for tests; modules must not accumulate registrations across
server fixtures. A convenience default base-game composition is acceptable if it
uses this same path, is initialized once and cannot be mutated after readiness.
Consumers must not capture incomplete tables during an import cycle. Independent
composition binds its content-aware schemas, equipment and stat helpers to its
own catalog. Live simulation may use one immutable default game created from the
bundled list; this design does not require per-world mod selection or injecting
a separate catalog through every simulation function. Tests of added combat
content must exercise a composition used by those combat consumers, not quietly
call helpers closed over a different base-only catalog. No mutable global catalog
switching is introduced.

Server startup must initialize before opening gameplay sessions and before
content-dependent save decode. Browser startup must initialize before deriving
class images, slot lists or prediction helpers. Both bundles include the same
ordered modules; the existing deployment/build version checks remain the
compatibility mechanism. Per-session mod selection and a new negotiation protocol
are not part of this migration.

## Validation and stable contracts

Content IDs become open string contracts where extensibility requires it. Existing
constant objects can remain useful names for built-in IDs without defining a
closed universe. Slot IDs, class IDs, item IDs, numeric stat keys, enemy archetype
IDs and ability IDs must not be narrowed back to base-only unions in downstream
APIs. Closed engine discriminants for supported behavior families remain closed.

Split shape validation from content validation. Common can check finite numbers,
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

Runtime save decode enumerates registered classes. Preserve version-1 to
version-2 Storehouse migration, per-class records, defaults, null/empty equipment
semantics and transaction ordering. Unknown definitions must produce an explicit
error without replacing or resaving the original data. Content removal and
renaming need a future migration policy; this change introduces neither a save
reset nor a new save version merely for moving definitions.

## Make registry data drive gameplay

[Class combat](../../packages/core/src/class-combat.ts) currently branches on
class IDs to choose projectile kinds, and [simulation](../../packages/core/src/simulation.ts)
branches on Druid and ranged class names. Resolve a class's registered ability
and optional companion first. Dispatch using supported behavior metadata rather
than checking the added class's name. Keep existing projectile kind IDs and wire
fields compatible; if an additional definition identity is needed alongside a
mechanic kind, define the optional field and backward-compatible default
explicitly and test its protocol round trip.

Class definitions declare a presentation family using existing class art;
ability definitions declare a mechanic family; enemies declare behavior and art
families. These are separate from each definition's stable ID.

Supported ability families initially cover the current melee, piercing projectile,
splash projectile and bouncing roots behavior. Enemy definitions select supported
melee or ranged behavior; movement/hitbox/attribute code must read the registered
enemy's values, not equate ranged behavior exclusively with `caster`. Base spawn
probabilities, alternating choices, boss timing and random-roll order remain
unchanged. Adding an enemy definition does not automatically change encounter
spawn composition; an encounter/spawn policy must reference it explicitly.

Slots carry compatibility and display metadata. Equipment aggregation traverses
registered slots and initializes registered numeric stats before summing item
contributions. Built-in clamps and derived formulas, such as armor reduction and
attack interval, preserve their current behavior. New additive numeric stats can
be aggregated/displayed; a new effect of a stat still requires a rule consuming
it. Damage types and other nonnumeric metadata are not summed as stats.

Move content-dependent equipment/inventory helpers and semantic schema creation
into core. Move bound world helpers or parameterize their common algorithms:
[world.ts](../../packages/common/src/world.ts) currently creates paths/trees at
import time, [scene.ts](../../packages/common/src/scene.ts) binds geometry and
interactions to definitions, and [hitboxes](../../packages/common/src/hitboxes.ts)
looks up enemy sizes. Retain reusable pure geometry in common while initializing
content-derived caches only after validation.

Client consumers must migrate with the rules: [class images](../../packages/client/src/characters.ts),
[class selection](../../packages/client/src/main.tsx), [equipment views](../../packages/client/src/equipment-view.tsx),
[action bar](../../packages/client/src/WeaponActionBar.tsx),
[prediction](../../packages/client/src/local-movement.ts),
[snapshots](../../packages/client/src/snapshots.ts), [forest rendering](../../packages/client/src/forest.ts),
[effects](../../packages/client/src/combat-effects.ts) and [debug hitboxes](../../packages/client/src/hitboxes.ts).
A new slot needs a usable layout fallback; a new class can reuse declared existing
art keys. Labels, stat formatting and supported ability descriptions come from
content or mechanic metadata. UI receives these as controlled views and gains no
core dependency. New art pipelines remain separate implementation work.

## Scope and verification

Core owns content composition and game rules; it does not become an HTTP server,
SQLite repository, Pixi renderer or universal scripting engine. Existing scene
states, one Bear slot, entity collections and action-bar reserved slots are not
silently generalized. Registries make supported content extensible; additional
mechanics or structural game modes require explicit contracts and implementation.

The [plan](../plans/mods.md#verification) requires base regression tests and an
additional bundled fixture reaching real runtime consumers. Successful registry
lookup alone does not establish extensibility. No gameplay or performance
improvement is claimed by this documentation-only change.
