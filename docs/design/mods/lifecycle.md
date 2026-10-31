# Registry ownership, lifecycle and validation

[Back to Core registries and bundled mods](../mods.md).

## Ownership and dependency direction

### Rolled gear instances

[ITEM-01–03](../../specs/item-rolls.md) adds core-owned rarity/stat configuration
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

`createCharacterPersistence(context)` in [characters.ts](../../../packages/server/src/characters.ts)
binds save decode, class enumeration and repository helpers to a ready context.
Runtime save decode enumerates registered classes. Preserve version-1 to
version-2 Storehouse migration, per-class records, defaults, null/empty equipment
semantics and transaction ordering. Unknown definitions must produce an explicit
error without replacing or resaving the original data. Content removal and
renaming need a future migration policy; this change introduces neither a save
reset nor a new save version merely for moving definitions.
