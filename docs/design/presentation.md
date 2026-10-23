# Client presentation and shared UI

Status: implemented. Implements [interface/audio](../specs/interface-and-audio.md) and [graphics](../specs/graphics.md). Prediction mechanics are in [movement](movement.md).

## Application and component boundaries

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

[main.tsx](../../packages/client/src/main.tsx) owns the connection, browser identity, recovery and screen composition. [Arena.tsx](../../packages/client/src/Arena.tsx) owns input capture and animation-frame drawing. Settings, Codex, chat and performance sampling are client concerns; server actions stay in the client host.

`packages/ui` exports controlled components and the shared theme. It has no game-package imports, network requests, persistence, gameplay rules or authorization. [Its README](../../packages/ui/README.md) is the canonical component API/build guide and is imported directly into Storybook by `Guide.mdx`; preserve that integration. Storybook screens are local-state examples, not another application state machine.

Use the existing theme → MUI defaults → colocated styled rules → small local `sx` hierarchy. Shared components expose typed data/callbacks, accessible labels and keyboard behavior. GameWindow supplies modal focus trapping/restoration and draggable titles; the client supplies persisted positions through context.

GameWindow provides a left tab rail through a private context. ChapterTabs portals its vertical tablist into that rail, outside the bordered content surface but inside the dialog focus scope and draggable frame. Untabbed windows omit the empty rail; standalone ChapterTabs uses an inline vertical layout. The rail narrows on small screens and scrolls independently of window content.

`WorldList` sends clicks anywhere in an available server row to the host's join callback. Its native name button remains the keyboard target and stops click propagation to avoid duplicate joins. Full worlds and the host's disabled state block both paths; hover and pointer styling apply only to available rows.

The action bar and wardrobe spell squares share dedicated class spell artwork (bleeding slash arc, poison arrows, twin flying fireballs, and zigzag roots); compact ailment markers retain their separate status artwork.

Wardrobe composes controlled `ClassCard` components in one four-column row inside a 600px `GameWindow`. Cards own layout and MUI tooltips; the client supplies portraits, weapon/spell descriptions, rounded class stats (level, XP, maximum HP and Power), selection state and callbacks. Only the selection button is disabled by selection, connection or countdown state. Tooltip buttons remain focusable. Window width is configurable without changing other dialogs. Matching Ninja Adventure facesets are shipped with the client and recorded in its asset notes.

PartyCard displays nickname and level within a single HP meter, without a heading. Its portrait and meter share the same theme height. Accessible host (top-right crown) and away-dimension (top-left door) icons overlay the portrait. The client supplies matching class facesets and calculates Power from each class loadout through characterStats.

An optional controlled companion view adds a shorter, narrower HP row beneath the player inside PartyCard. The client supplies the companion name, confirmed health and portrait from their existing companion sprite art. StatusMeter retains accessible health values at the compact size; no companion state or gameplay rules live in the UI package.

## Content-driven views

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

- [village-background.ts](../../packages/client/src/village-background.ts) prepares village ground, grass and static passes only after the asset batch is ready and the village is first drawn. Its cache survives joins/leaves/reconnects; grass, shadow and contact-occlusion changes invalidate affected content.
- [forest.ts](../../packages/client/src/forest.ts), [village.ts](../../packages/client/src/village.ts) and [paths.ts](../../packages/client/src/paths.ts) draw the world with visible-region and wrapped-seam handling.
- [lighting.ts](../../packages/client/src/lighting.ts) caches sprite masks/static shadows and reuses scratch canvases; moving blockers and player lights update dynamically.
- [combat-effects.ts](../../packages/client/src/combat-effects.ts), [effects.ts](../../packages/client/src/effects.ts), [danger.ts](../../packages/client/src/danger.ts) and [navigation.ts](../../packages/client/src/navigation.ts) render authoritative events, warnings and navigation.
- [critters.ts](../../packages/client/src/critters.ts) derives decorative animal motion locally. These animals are not server actors or targets.

Cull offscreen actors before expensive sprite masks/shadows, share identical sprite/grass canvases, copy presentation positions instead of whole combat state, and index hit events once per frame. Full-map redraws and cache invalidation during world joins previously caused stalls; keep startup and re-entry coverage when changing cache lifetime.

Item drops draw a 6-by-36 world-unit fading beam behind their existing icons in
`drawLootAndBlood`, using the same wrapped ground position and visible-region
culling. Pixi reuses the gradient ramp; the marker needs no bloom or particles.
`tests/renderer-pixels.spec.ts` checks the visible beam and its bounded footprint.

Player chat is drawn after world effects in both scenes. The rounded message box has no pointer; its bottom sits two world units above the health bar, overlaying the debuff area. The renderer uses the same placement and wrapping.

## Preferences, diagnostics and audio

[graphics.ts](../../packages/client/src/graphics.ts) and [preferences.ts](../../packages/client/src/preferences.ts) validate persisted settings and fall back to defaults. [panel-positions.ts](../../packages/client/src/panel-positions.ts) persists draggable-window placement. Rendering scale and frame caps affect presentation only; simulation/input cadence remains independent.

[PerformanceGraph.tsx](../../packages/client/src/PerformanceGraph.tsx) samples FPS and network metrics using monotonic timing. Local snapshot age excludes network transit; ping, acknowledgement delay and presentation backlog are different measurements. The shared UI graph receives data; it does not own sampling. DPS comes from authoritative damage history. Arena renders its meter only when the saved `dps` preference is enabled, independently of the performance graph; hiding it does not affect damage tracking or its saved panel position.

[audio.ts](../../packages/client/src/audio.ts) owns user-gesture unlock, bounded effect voice pools, per-area playlists, crossfades and hidden-tab suspension. Predicted local swing sounds stop on stale snapshots and do not replay missed attacks after reconnect. Asset provenance lives in [assets](../assets.md).

## Verification and limits

Use [rendering/audio](../../tests/rendering.spec.ts) and the [UI suite](../../packages/ui/tests/ui.spec.ts), selecting cases relevant to the change. Validate desktop/narrow screens, keyboard focus and reduced motion for UI work.

For measured frame budgets use the opt-in browser scenario in [development](../development.md). The original snapshot benchmark is retired. Passing tests and builds do not establish hardware performance or subjective audio quality.
