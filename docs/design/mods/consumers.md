# Content consumers and verification

[Back to Core registries and bundled mods](../mods.md).

## Make registry data drive gameplay

[Class combat](../../../packages/core/src/class-combat.ts) and
[simulation](../../../packages/core/src/simulation.ts) resolve the registered class's
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
[World helpers](../../../packages/core/src/world.ts) derive paths and seeded trees;
[scene helpers](../../../packages/core/src/scene.ts) bind world geometry/interactions;
[hitboxes](../../../packages/core/src/hitboxes.ts) resolve enemy sizes. Pure wrapping
algorithms remain in [common geometry](../../../packages/common/src/geometry.ts).
Content-derived views initialize after `game` is ready.

Client consumers read the initialized content: [class images](../../../packages/client/src/characters.ts),
[class selection](../../../packages/client/src/main.tsx), [equipment views](../../../packages/client/src/equipment-view.tsx),
[action bar](../../../packages/client/src/WeaponActionBar.tsx),
[prediction](../../../packages/client/src/local-movement.ts),
[snapshots](../../../packages/client/src/snapshots.ts), [forest rendering](../../../packages/client/src/forest.ts),
[effects](../../../packages/client/src/combat-effects.ts) and [debug hitboxes](../../../packages/client/src/hitboxes.ts).
A new slot declares its grid position; a new class reuses a declared existing
art family. [Pure content views](../../../packages/client/src/content-views.ts)
derive slot positions/fallback icons and added numeric stat rows; loot icons
reuse the same fallback for added slots. Debug melee overlays resolve ability
kind rather than a built-in class name. EquipmentPanel
grows to the supplied coordinates, retaining a minimum three-column/four-row
layout. Class `details` supplies descriptions from base content or uses generic
text when omitted; labels and supported ability descriptions resolve from content
or mechanic metadata. UI receives these as controlled views and gains no
core dependency. New art pipelines remain separate implementation work. The
[core guide](../../../packages/core/docs/authoring.md#add-a-bundled-mod) contains a standalone
registration example and explains how to avoid importing default-game views from
a bundled mod.

## Scope and verification

Core owns content composition and game rules; it does not become an HTTP server,
SQLite repository, Pixi renderer or universal scripting engine. Existing scene states, one Bear slot, the four ailment identities, three enemy
types, three difficulty identities, pickup/effect/critter identities, entity
collections and action-bar reserved slots remain fixed. Startup rejects unsupported identities in those families. Registries make supported content extensible; additional
mechanics or structural game modes require explicit contracts and implementation.

The [plan](../../plans/mods.md#verification) requires base regression tests and an
additional bundled fixture reaching real runtime consumers. Successful registry
lookup alone does not establish extensibility. The migration preserves gameplay; it makes no performance improvement claim.
