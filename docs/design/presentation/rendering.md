# Rendering pipeline and caches

[Back to Client presentation and shared UI](../presentation.md).

## Rendering pipeline and caches

`day-night.ts` derives the one-hour ambient sprite tint, daylight and local-light
intensity and a sun/moon shadow projection from replicated epoch `serverNow`,
independently of paused combat time. The sun crosses the 70% daytime arc; the
weaker moon crosses the remaining 30%. Elevation controls length and horizon fade.
Arena and forest share it. Pixi multiplies ordinary image tints without changing
text, geometry warnings, or additive light passes. Each Pixi context carries its
current directional projection for all silhouette casters, including portals.
Celestial shadows draw live; the ground cache retains only terrain and contact
shading, while fixed torch occlusion remains cached. No textures are rebuilt for
the cycle. `effects.ts` scales sunlight shafts by daylight.
The clock uses smooth interpolation between palette keys and wraps continuously.

[art.ts](../../../packages/client/src/art.ts) bakes softer entity tones once when
loading packaged actor and scenery atlases. Dark pixels borrow a little color
from adjacent opaque material, with a small contrast reduction. Alpha is preserved;
terrain, pickup icons and effects retain their original palettes. Source PNGs stay
unchanged. [art-tones.ts](../../../packages/client/src/art-tones.ts) owns the pixel transform.
Arena applies the persisted Smooth textures preference before drawing either area.
Pixi source textures use linear or nearest sampling on use, including cached
sources; text and procedural gradient textures retain their own sampling. Canvas
CSS scaling stays smooth so text does not inherit sprite pixelation.

Village trees, rocks and plants use immutable seeded placements from core's `world.ts`.
They share path/building/training clearance; new seeds do not move existing trees.
`villageSprites` packages the existing environment rock cell and five generated plant
cells into the usual scenery/mask pipeline. The background waits for plant art before
caching shadows and contact shading for permanent scenery. Gatherable resource
shadows and light occlusion use their current sprite so stumps and cut plants
replace full silhouettes immediately. Plants share the tree sway path; rocks stay fixed.
Core resource identities match the existing village placements. Hover masks include
living resources; depleted sprites remain visible during the server-owned cooldown.
Tree health bars use replicated remaining gathers and disappear on depletion or restoration.
`world-bar.ts` draws the shared 7-unit frame (5-unit fill, 1-unit border) for
gathering and every overhead health bar. Health bars keep their bottom anchors,
widths and colors; names stay fixed while debuffs and speech clear the new top.
The default-on `hideHealthBarsInTown` browser preference suppresses village
health fills/frames in `Arena.tsx` and `companion.ts`, preserving actor names.
The forest renderer retains its normal health bars independently of this setting.

The controlled [ActionBar](../../../packages/ui/src/components/ActionBar.tsx) renders
the optional base ability and four reserved slots, with an SVG cooldown sector
and numeric countdown. [WeaponActionBar](../../../packages/client/src/WeaponActionBar.tsx)
supplies the current class ability, the same ability artwork as Wardrobe and
remaining time from replicated `attackAt`, `serverNow` and `characterStats().attackIntervalMs`.
It mounts only for the local player. The host fixes the bar at bottom center and
moves chat above it on narrow screens. UI owns no clock or combat commands.
The host also passes the local auto-attack and auto-target preferences. Corner
indicators sit above the cooldown sector: an LMB icon at bottom right and crosshairs
at bottom left, each with an independent enabled glow and reduced-motion-aware
pulse. The four reserved slots display 1–4 at bottom right.

`EquipmentPanel` and `Backpack` compose the internal shared `ItemTooltip` layout.
The client supplies names, existing artwork, type labels, Armor, weapon stat rows,
effects, healing text and unit prices from registered content. Backpack, trading
and storage use the same weapon details and current aiming mode. The layout uses
250px, viewport-clamped tooltips with 32px artwork, compact stat rows and a shared
price/action footer. Weapon Power and Armor receive a larger amber value; effect
explanations remain readable inline. Resources omit gameplay action hints in the
normal backpack; trader and storage hints reflect their host callbacks.
`backpackViews` checks registered equipment slots with core's `canEquip` and the
current class, supplying an optional `equipRestriction` to `ItemTooltipView`.
The controlled tooltip renders that text with the theme's `error.main` color.
Restricted gear omits `useAction`; explicit trade and storage actions remain.

`item-comparison.ts` uses the shared equip-slot rules to compare candidate base
contributions and rolled bonuses with the equipped definition and matching
instance. It passes signed, formatted rows through `ItemTooltipView.comparison`;
the shared tooltip renders them with semantic gain/loss colors, replacing the
standalone primary and numeric stat rows without a comparison heading. Effect
descriptions remain visible. Unchanged rows
are omitted, with “Same stats” for identical contributions. This compares items,
not projected final character stats.

`theme.tsx` applies shared `windowSurface` styles to game windows and MUI tooltips.
Item popups and stat explanations portal into the modal container (or the page for
nonmodal stories) to avoid scrolling-content clipping while preserving modal
focus and pointer interaction. Tab/Shift+Tab connect equipped slots with their
first stat across the portal; long tooltip content is viewport-clamped and scrollable.
The existing `EquipmentBadgeView` input remains the stat/explanation contract,
without rendering its old icon atlas. `ActionBar` keeps its existing focusable
ability group and host-supplied cooldown and automation settings. Gameplay
calculations stay in the host.

Drawing combines predicted local presentation with buffered remote actors. The camera centers the local player and projects the nearest wrapped copy of terrain, entities, attachments, cursor aim and navigation arrows. Sort sprites/scenery by depth; faded scenery does not change its shadow or collision behavior.

Both scene renderers draw projectiles, explosions, talent cast art and
`drawPlayerAttack` immediately after their background pass. `drawPlayerDetails`
keeps overhead vitals and connection labels in the actor pass, so effects never
cover scenery, combatants or their labels.

`navigation.ts` includes the registered lobby portal as a blue Forest portal target for village players, alongside same-scene party members. Forest players retain boss and completed-scene return portal targets. All targets share wrapped projection and on-screen suppression; `tests/navigation.test.ts` covers these navigation outcomes.

- [village-background.ts](../../../packages/client/src/village-background.ts) prepares village ground, grass and static passes only after the asset batch is ready and the village is first drawn. Its cache survives joins/leaves/reconnects; grass, shadow and contact-occlusion changes invalidate affected content.
- [forest.ts](../../../packages/client/src/forest.ts), [village.ts](../../../packages/client/src/village.ts) and [paths.ts](../../../packages/client/src/paths.ts) draw the world with visible-region and wrapped-seam handling.
- [lighting.ts](../../../packages/client/src/lighting.ts) caches sprite masks and reuses scratch canvases; celestial projections, moving blockers and player lights update dynamically.
- [combat-effects.ts](../../../packages/client/src/combat-effects.ts), [effects.ts](../../../packages/client/src/effects.ts), [danger.ts](../../../packages/client/src/danger.ts) and [navigation.ts](../../../packages/client/src/navigation.ts) render authoritative events, warnings and navigation.
- [critters.ts](../../../packages/client/src/critters.ts) derives decorative animal motion locally. These animals are not server actors or targets. The arena owns a bounded chicken motion state per mount, updates every chicken before culling, and supplies living village player positions. Chickens flee the nearest player within 70 world units at 80 units/second (normal wandering is 10), keep fleeing until 100 units clear, and walk back toward their wandering route. Wrapped deltas drive detection, travel and camera projection; elapsed steps are capped at 100 ms after pauses. Panic uses a faster 70 ms walking-frame cadence.

Cull offscreen actors before expensive sprite masks/shadows, share identical sprite/grass canvases, copy presentation positions instead of whole combat state, and index hit events once per frame. Full-map redraws and cache invalidation during world joins previously caused stalls; keep startup and re-entry coverage when changing cache lifetime.

Item drops draw a 6-by-36 world-unit fading beam behind their existing icons in
`drawLootAndBlood`, using the same wrapped ground position and visible-region
culling. Pixi reuses the gradient ramp; the marker needs no bloom or particles.
`tests/renderer-pixels.spec.ts` checks the visible beam and its bounded footprint.

Player chat is drawn after world effects in both scenes. The rounded message box has no pointer; its bottom sits two world units above the health bar, overlaying the debuff area. The renderer uses the same placement and wrapping.

`npc-work.ts` draws eight bounded, deterministic particle loops keyed to workstation
activity and the replicated work start time. Arena passes the wrapped worker
projection and particle preference; station offsets share that projection. Small
filled discs and outlined bubbles use native Pixi geometry without per-particle
blur filters, procedural tool rectangles, persistent emitters or new textures.
