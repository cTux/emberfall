# Client presentation and shared UI

Status: implemented. Implements [interface/audio](../specs/interface-and-audio.md) and [graphics](../specs/graphics.md). Prediction mechanics are in [movement](movement.md).

## Application and component boundaries

Ability visibility lives in `emberfall-new.preferences`, independently of quality
presets. `abilityEffectOpacity` filters by owner and supplies the alpha multiplier
to both training and forest renderers. Explosions carry optional `ownerId` metadata
from the shared combat/talent producers through existing scene replication; older
ownerless visuals remain visible. Each effect multiplies its animation fade by
the selected opacity. Enemy danger rendering uses its existing independent pass.

Bundled item textures resolve through `class-art.ts`'s item lookup for both
inventory views and world loot. Plant items reuse their own generated plant
cells. Empty equipment-slot hints remain separate from item artwork.
Storehouse and Lodge load dedicated native images; their aspect-preserving world
dimensions also size their alpha masks. Resource-state sprites keep their authored
128px ground anchors through native loading. `resourceScenery` caches each kind,
variant and live/depleted state together with its shadow mask; restoration selects
the cached live state in both village and forest. NPC sprite choices are unchanged.

The host's `cursors.scss` supplies transparent PNG native cursors with explicit
hotspots and system fallbacks, including portaled UI. Preferences supply a body-level
size attribute selecting pre-sized 32/48/64 px PNGs and hotspots measured in each
final image. Fingertips and blade tips stay at the pointer position. Open and closed
drag hands use the same hotspot coordinates as the default cursor at each size,
keeping the image position stable when hovering or pressing a drag handle. Disabling
custom cursors overrides all cursor variables with their native keywords. The host
applies preferences independently of storage writes, so unavailable storage does
not prevent live changes. Shared drag handles expose
`data-drag-handle` without depending on host assets. `cursors.ts` derives combat
feedback from detached displayed poses, shared weapon/training rules and enemy
model hitboxes. Arena projects the pointer through its input camera and uses
wrapped distances for hover feedback, updating `data-cursor` only on state changes.
Pointer leave, blur and visibility changes clear hover feedback; modal and text
entry blocking applies alongside existing input suppression. Browser coverage is
in [cursor scenarios](../../tests/cursors.spec.ts).

`interaction-targets.ts` picks opaque pixels of functional scenery and portals in
display depth order, using the same wrapped camera as rendering. It caches yellow hover and green held-Alt
one-world-unit silhouette outlines per finite sprite frame, display size and color.
Arena tracks both Alt keys and the start of a continuous hold, shows green outlines
only after more than 500 ms, prevents their browser defaults, and clears them on
blur or visibility change. Its existing interaction targets supply green outlines
in depth order while gameplay input is unblocked, without changing picking or range.
Range uses confirmed player positions and the existing entrance/NPC/portal geometry.
Arena routes in-range left clicks to Game's existing E action and suppresses combat
for clicks on functional targets. Hovered targets take priority over nearby E
fallbacks; an out-of-range hover cannot activate another nearby object. Names and
badges have no interaction-dependent styling. Browser coverage is in
[interaction outlines](../../tests/interaction-outlines.spec.ts).

Arena draws the local player's interaction prompt after world rendering in both
areas, using the selected E action, confirmed living state and existing input
blocking. `drawInteractionPrompt` in `effects.ts` places a separate circular E
badge and short interaction name below the player's name at the displayed pose.
It shares the world camera transform, stays above scenery but beneath speech
bubbles, and exposes its current label as `data-interaction-prompt` for the
interaction browser scenarios.
The saved `hideGatheringHintInCombat` preference defaults to true. Arena suppresses
only `gather:` prompt labels during active forest scenes or active village training
inside a training zone, using confirmed state. Interaction selection and actions
are unchanged. [Gathering coverage](../../tests/gathering.spec.ts) checks visibility,
the setting override and persistence.
The capsule uses semicircular ends; its left end shares the button's center.
Concentric 6/5-unit circles form the button rim and face inside the capsule's
8-unit radius. Native renderer gradients and separate shadows provide depth
without changing geometry or adding image assets.

[main.tsx](../../packages/client/src/main.tsx) owns the connection, browser identity, recovery and screen composition. [Arena.tsx](../../packages/client/src/Arena.tsx) owns input capture and animation-frame drawing. Settings, Codex, chat and performance sampling are client concerns; server actions stay in the client host.

`ChatProvider` in the client entry point keeps one chat outside account, game and lazy-loading boundaries. Account handlers, the game connection and content boundaries report private system errors there; Game supplies the filtered world conversation and send action. Local errors and newly received conversation entries share arrival order and the ten-message display limit. Joining another world replaces its conversation while retaining private errors.

`packages/ui` exports controlled components and the shared theme. It has no game-package imports, network requests, persistence, gameplay rules or authorization. [Its README](../../packages/ui/README.md) is the canonical component API/build guide and is imported directly into Storybook by `Guide.mdx`; preserve that integration. Storybook screens are local-state examples, not another application state machine.

Use the existing theme → MUI defaults → colocated styled rules → small local `sx` hierarchy. Shared components expose typed data/callbacks, accessible labels and keyboard behavior. GameWindow supplies modal focus trapping/restoration and draggable titles; the client supplies persisted positions through context.

Game owns the F1 Codex, Escape Settings, I Inventory and N Talents shortcuts. Opening hotkeys toggle their own windows closed, while typing, modifiers, repeats and other open windows guard against unintended toggles. F1 cancels browser help before repeat handling, including while a window is open. HudActions accepts optional shortcut text for its tooltip while preserving the action's accessible name. Exit remains an explicit HUD action.

GameWindow provides a left tab rail through a private context. ChapterTabs portals its vertical tablist into that rail, outside the bordered content surface but inside the dialog focus scope and draggable frame. Untabbed windows omit the empty rail; standalone ChapterTabs uses an inline vertical layout. The rail narrows on small screens and scrolls independently of window content.

`WorldList` sends clicks anywhere in an available server row to the host's join callback. Its native name button remains the keyboard target and stops click propagation to avoid duplicate joins. Full worlds and the host's disabled state block both paths; hover and pointer styling apply only to available rows.

The action bar and wardrobe spell squares share dedicated class spell artwork (bleeding slash arc, poison arrows, twin flying fireballs, and zigzag roots); compact ailment markers retain their separate status artwork.

Wardrobe composes controlled `ClassCard` components in one four-column row inside a 600px `GameWindow`. Cards own layout and MUI tooltips; the client supplies portraits, weapon/spell descriptions, rounded class stats (level, XP, maximum HP and Power), selection state and callbacks. Only the selection button is disabled by selection, connection or countdown state. Tooltip buttons remain focusable. Window width is configurable without changing other dialogs. Matching Ninja Adventure facesets are shipped with the client and recorded in its asset notes.

PartyCard displays nickname and level within a single HP meter, without a heading. Its portrait and meter share the same theme height. Accessible host (top-right crown) and away-dimension (top-left door) icons overlay the portrait. The client supplies matching class facesets and calculates Power from each class loadout through characterStats.

An optional controlled companion view adds a shorter, narrower HP row beneath the player inside PartyCard. The client supplies the companion name, confirmed health and portrait from their existing companion sprite art. StatusMeter retains accessible health values at the compact size; no companion state or gameplay rules live in the UI package.

## Content-driven views

`TalentIcon` uses measured pixel boundaries for the uneven five-by-six class
atlases, shared by the talent tree and action bar. `TalentTree` receives the
catalog's optional `kind` and outlines active icons in `info.main`; rank borders
and passive styling remain independent of this marker. Unlearned cards use a
transparent border to preserve their size when learned; only learned cards show
the primary border color. Keyboard focus keeps its separate outline.

Available classes, equipment slots and extra numeric stat rows derive from the
initialized core catalog. Classes and enemies declare existing art families;
equipment slots declare their labels and grid positions. Pure client content
view helpers build slot/stat views; EquipmentPanel grows beyond its minimum
three-column/four-row grid when supplied slots require it. Class descriptions
use registered `details` or generic fallbacks. Ability descriptions
resolve supported mechanic kinds independently of definition IDs. Controlled UI
receives view data and has no game-package dependency. See the
[mod design](mods.md#make-registry-data-drive-gameplay).

## Rendering pipeline and caches

`day-night.ts` derives the one-hour ambient sprite tint, daylight and local-light
intensity from replicated epoch `serverNow`, independently of paused combat time.
Arena and forest share it. Pixi multiplies ordinary image tints without changing
text, geometry warnings, or additive light passes; no textures or shadow caches
are rebuilt for the cycle. `effects.ts` scales sunlight shafts by daylight.
The clock uses smooth interpolation between palette keys and wraps continuously.

[art.ts](../../packages/client/src/art.ts) bakes softer entity tones once when
loading packaged actor and scenery atlases. Dark pixels borrow a little color
from adjacent opaque material, with a small contrast reduction. Alpha is preserved;
terrain, pickup icons and effects retain their original palettes. Source PNGs stay
unchanged. [art-tones.ts](../../packages/client/src/art-tones.ts) owns the pixel transform.
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

The controlled [ActionBar](../../packages/ui/src/components/ActionBar.tsx) renders
the optional base ability and four reserved slots, with an SVG cooldown sector
and numeric countdown. [WeaponActionBar](../../packages/client/src/WeaponActionBar.tsx)
supplies the current class ability, the same ability artwork as Wardrobe and
remaining time from replicated `attackAt`, `serverNow` and `characterStats().attackIntervalMs`.
It mounts only for the local player. The host fixes the bar at bottom center and
moves chat above it on narrow screens. UI owns no clock or combat commands.
The host also passes the local auto-attack and auto-target preferences. Corner
indicators sit above the cooldown sector: an LMB icon at bottom right and crosshairs
at bottom left, each with an independent enabled glow and reduced-motion-aware
pulse. The four reserved slots display 1–4 at bottom right.

EquipmentPanel receives item badge labels, atlas keys, optional values and explanations
from `client/equipment-view.tsx`, which derives them from shared equipment,
attack and ailment definitions. The shared UI bundles a transparent generated icon
atlas and presents 236px tooltips. `theme.tsx` applies shared `windowSurface`
styles to game windows and MUI tooltips, including equipment and action-bar
details; the client no longer needs a separate window skin. `ActionBar` uses
a focusable ability group and a MUI tooltip for hover, keyboard and touch,
showing host-supplied cooldown and automation settings. Item popups and badge explanations portal into the modal container
(or the page for nonmodal stories) to avoid scrolling-content clipping while
preserving modal focus and pointer interaction. Tab/Shift+Tab connect each slot
with its first badge across the portal. Click/tap explicitly opens details;
MUI handles hover/focus and closing. Gameplay calculations stay in the host.

Drawing combines predicted local presentation with buffered remote actors. The camera centers the local player and projects the nearest wrapped copy of terrain, entities, attachments, cursor aim and navigation arrows. Sort sprites/scenery by depth; faded scenery does not change its shadow or collision behavior.

Both scene renderers draw projectiles, explosions, talent cast art and
`drawPlayerAttack` immediately after their background pass. `drawPlayerDetails`
keeps overhead vitals and connection labels in the actor pass, so effects never
cover scenery, combatants or their labels.

`navigation.ts` includes the registered lobby portal as a blue Forest portal target for village players, alongside same-scene party members. Forest players retain boss and completed-scene return portal targets. All targets share wrapped projection and on-screen suppression; `tests/navigation.test.ts` covers these navigation outcomes.

- [village-background.ts](../../packages/client/src/village-background.ts) prepares village ground, grass and static passes only after the asset batch is ready and the village is first drawn. Its cache survives joins/leaves/reconnects; grass, shadow and contact-occlusion changes invalidate affected content.
- [forest.ts](../../packages/client/src/forest.ts), [village.ts](../../packages/client/src/village.ts) and [paths.ts](../../packages/client/src/paths.ts) draw the world with visible-region and wrapped-seam handling.
- [lighting.ts](../../packages/client/src/lighting.ts) caches sprite masks/static shadows and reuses scratch canvases; moving blockers and player lights update dynamically.
- [combat-effects.ts](../../packages/client/src/combat-effects.ts), [effects.ts](../../packages/client/src/effects.ts), [danger.ts](../../packages/client/src/danger.ts) and [navigation.ts](../../packages/client/src/navigation.ts) render authoritative events, warnings and navigation.
- [critters.ts](../../packages/client/src/critters.ts) derives decorative animal motion locally. These animals are not server actors or targets. The arena owns a bounded chicken motion state per mount, updates every chicken before culling, and supplies living village player positions. Chickens flee the nearest player within 70 world units at 80 units/second (normal wandering is 10), keep fleeing until 100 units clear, and walk back toward their wandering route. Wrapped deltas drive detection, travel and camera projection; elapsed steps are capped at 100 ms after pauses. Panic uses a faster 70 ms walking-frame cadence.

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

## Preferences, diagnostics and audio

`hideOtherPlayerDamageNumbers` defaults to true and accepts saved booleans.
Both forest and training pass the local player ID to `drawDamageNumbers` while
enabled; the shared renderer draws only events owned by or targeting that player.
Filtering leaves authoritative events and DPS data intact. Disabling the preference
omits the ID and renders every scene event, subject to the master `damageNumbers` toggle.

[graphics.ts](../../packages/client/src/graphics.ts) and [preferences.ts](../../packages/client/src/preferences.ts) validate persisted settings and fall back to defaults. DPS, FPS and latency visibility default to false; saved boolean choices override those defaults. [panel-positions.ts](../../packages/client/src/panel-positions.ts) persists draggable-window placement. Rendering scale and frame caps affect presentation only; simulation/input cadence remains independent.

[PerformanceGraph.tsx](../../packages/client/src/PerformanceGraph.tsx) samples FPS and network metrics using monotonic timing. Local snapshot age excludes network transit; ping, acknowledgement delay and presentation backlog are different measurements. The shared UI graph receives data; it does not own sampling. `PerformanceMonitor` uses caption typography, one readings/scale row, a shallow SVG plot and one legend row. The client constrains the draggable panel to 224 pixels wide; sampling and saved visibility are unchanged. DPS comes from authoritative damage history. Arena renders its meter only when the saved `dps` preference is enabled, independently of the performance graph; hiding it does not affect damage tracking or its saved panel position.

[audio.ts](../../packages/client/src/audio.ts) owns user-gesture unlock, bounded effect voice pools, per-area playlists, crossfades and hidden-tab suspension. Predicted local swing sounds stop on stale snapshots and do not replay missed attacks after reconnect. Asset provenance lives in [assets](../assets.md).

## Verification and limits

Use [rendering/audio](../../tests/rendering.spec.ts) and the [UI suite](../../packages/ui/tests/ui.spec.ts), selecting cases relevant to the change. Validate desktop/narrow screens, keyboard focus and reduced motion for UI work.

For measured frame budgets use the opt-in browser scenario in [development](../development.md). The original snapshot benchmark is retired. Passing tests and builds do not establish hardware performance or subjective audio quality.

Action-bar assignment uses LMB and a host-owned icon menu with a generated red clear
tile. RMB invokes controlled auto-cast callbacks. WeaponActionBar saves per-ability
choices in browser preferences and requests ready casts at 250 ms intervals using
the existing server-validated command. The global auto-attack setting gates these
requests. The shared UI renders an SVG dashed border with reduced-motion support.
