# Runtime composition and ownership

[Back to Game runtime](../new-runtime.md).

## Game composition

Core initializes registries and the explicit bundled mod list before gameplay.
[Mod requirements](../../specs/mods.md), [registry design](../mods.md) and the
[verification plan](../../plans/mods.md) define supported extension and compatibility.
Common retains structural contracts and pure geometry; content-aware rules and
views belong to core. Existing saved IDs and host responsibilities remain intact.

## Ownership

Storehouse names, inventories and gold live once in the account's version-2 save,
outside its class records. Each Steam account owns one saved identity with multiple
classes; existing duplicate-session protection prevents concurrent owners. Live
player `coins` and `storages` project this account state for existing pickup,
trading and UI consumers. Class selection preserves those fields. Version-1 saves
merge old balances and tab contents once, returning overflow to owning backpacks;
version-2 reads never re-import class balances. Older servers reject version 2.
The existing character transaction saves detached transfer/rename results
before publishing them. The server validates session ownership, living village
status and Storehouse proximity. The client composes ChapterTabs and Backpack;
storage capacity is 40 while the existing player backpack remains 20 slots.

Inventory dragging uses native browser drag events in controlled Backpack and
ChapterTabs views. Per-inventory MIME types identify allowed sources before drop;
the payload contains only an item ID. The host sends existing store/trade commands
or a validated storage-to-storage command. The server derives the owner from the
session and saves detached results before publication; drag data never supplies
items, quantities, currency or a different owner.

- `common`: shared contracts, structural schemas, protocol state and pure geometry.
  No DOM, database or network connections and no dependency on core.
- `core`: registries, bundled mods, semantic validation and shared combat/prediction;
  depends on common. Only the server rolls spawns and rewards or applies damage.
- `server`: authoritative Miniplex entities, ordered fixed-timestep systems,
  Colyseus transport/state projection and Colyseus database persistence.
- `client`: Colyseus SDK, presentation/prediction Miniplex world, PixiJS world
  rendering, audio and screen composition using the shared UI package.
- `ui`: controlled components and theme for the client and Storybook.

Definition objects describe types; mutable entities describe instances. Stable
definition IDs connect them. The simulation owns live state; network projections
and render objects never write damage, rewards or saved progress back into it.

Training definitions keep the 270-unit combat radius separate from the 135-unit
vegetation clearing radius, preserving seeded tree placement. The client renders
dummies without a zone fill or outline; shared wrapped geometry still gates attacks.

Village dummies join the same foot-position render sort as scenery and actors. Foreground actor bodies and scenery share an inverse stencil mask of the reconciled local player’s current sprite silhouette, dilated by 10 game pixels. The cutout reveals previously drawn world layers while preserving opacity elsewhere; health bars keep full opacity. Frame silhouettes are rasterized and expanded once per source pose and integer display size, then reused as non-overlapping horizontal stencil spans. The renderer owns the reusable mask geometry and releases it on disposal. Shared player definitions own the reduced body and incoming-projectile hit radii.
