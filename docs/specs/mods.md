# Bundled game mods

Status: implemented bundled-content architecture. See the
[verification record](../plans/mods.md#verification) for execution evidence.
The shipped gameplay remains specified by [characters](characters.md),
[combat](combat.md), [scenes](scenes-and-village.md) and [progression](progression.md).
Implementation and sequencing are in the [mod design](../design/mods.md) and
[plan](../plans/mods.md).

## MOD-01 — One content catalog

A game author can add content through bundled TypeScript mods. Core owns the
registries and their lifecycle. The base mod registers all currently shipped
content through the same registration interface as additional mods; it does not
receive a separate privileged catalog. Items, equipment slots, stats, classes,
enemies and abilities must be extensible. Other existing definition families,
including ailments, companions, pickups, encounters, worlds and presentation
metadata, participate in the same content model.

The base mod preserves existing IDs, values, selection order and gameplay.
A registry entry must reach its relevant game consumers; a disconnected catalog
that the live game ignores does not satisfy this requirement.

## MOD-02 — Complete startup before play

Startup creates empty registries, loads the explicit bundled mod list, registers
content, validates and initializes it, and only then starts the playable runtime.
The browser and server use the same bundled content. Duplicate mod or definition
IDs, invalid values, missing references and unsupported mechanic declarations
fail startup with actionable context. Failed initialization exposes no partially
usable game. Registration closes after initialization.

Mods are trusted build-time TypeScript modules. Downloading or executing player
supplied code, runtime directory discovery, hot reload, a mod marketplace,
dependency resolution and multiplayer content negotiation are out of scope.
Changing the bundle requires rebuilding and restarting the game.

## MOD-03 — Useful content extension

An additional item can be equipped, stored, traded and saved under its registered
ID. An additional compatible slot participates in validation, stat calculation,
equipment commands and UI. An additional numeric stat has a declared default and
aggregation/display policy and appears in derived totals; adding its definition
does not invent a new combat effect automatically.

An additional class can reuse supported ability and presentation families, appear
in class selection, receive its declared starters and retain independent saved
progress. An additional enemy or ability can reuse supported engine behavior
with its own registered parameters and identity. Authoritative combat and client
prediction use the same resolved definitions. Forest and training continue using
the shared combat path.

New mechanic families require engine and presentation support with tests. The
first migration does not promise arbitrary scripted AI, new entity component
layouts, additional active ability slots, multiple simultaneous companions, or
additional playable scene types merely from a definition. Pickup, effect,
critter, ailment and enemy type/difficulty families retain their supported
identities. Added enemies require explicit registered spawn rules; adding the
definition alone does not alter spawn probabilities. Unsupported content
must be rejected or clearly excluded from a selectable/spawnable configuration,
not silently substituted with an unrelated base entity.

## MOD-04 — Stable progress and authority

All existing saved and wire IDs retain their spelling and meaning. Missing legacy
equipment still receives the appropriate starter; an explicit empty loadout stays
unarmed. Per-class progress, account Storehouse balances/inventories, merchant
stock and buyback retain their existing migration and transaction rules. Unknown
content in a save must fail with context rather than being silently discarded or
rewritten as a new character. Removing or renaming mod content needs a separately
designed migration.

Common remains independent of core. Structural message validation and
registry-backed semantic validation together preserve the server trust boundary.
Clients cannot introduce content, bypass class/slot compatibility or supply
trusted combat results. Only the server applies health changes, damage, rewards
and saves. Existing wrapped geometry, prediction acknowledgements, reconnects,
automatic progression and uninterrupted gameplay remain intact.

## Acceptance scenarios

1. Start with the base mod alone: all four classes, current equipment, enemies,
   forest, village training, rewards and saves behave as before.
2. Add a fixture mod after base using the public registration API. Its item,
   slot and stat pass through equip, derived totals, UI view construction,
   save/reload and unequip. Its class is selectable with independent progress.
3. Use a fixture ability and enemy built from supported mechanics in shared
   combat. Their registered parameters affect real attacks, movement/hitboxes
   and prediction, including wrapped edges and training where applicable.
4. Reject duplicate IDs, dangling references, invalid numbers, unsupported
   behavior and registration after initialization before a game can start.
5. Load existing save fixtures and round-trip protocol state without changing
   base IDs or losing content. Reject unknown saved content and unknown command
   IDs before mutation; save failures leave live state unchanged.
6. Initialize independent catalogs in tests without registration leaking between
   them. Verify importing common cannot initialize core or the base mod.

Existing regression suites and planned extension checks are mapped in the
[implementation plan](../plans/mods.md#verification). Test links describe coverage
seams, not results of tests executed for this specification.
