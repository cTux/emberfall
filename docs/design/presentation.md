# Client presentation and shared UI

Status: implemented. Implements [interface/audio](../specs/interface-and-audio.md) and [graphics](../specs/graphics.md). Prediction mechanics are in [movement](movement.md).

## Application and component boundaries

[main.tsx](../../packages/client/src/main.tsx) owns the connection, browser identity, recovery and screen composition. [Arena.tsx](../../packages/client/src/Arena.tsx) owns input capture and animation-frame drawing. Settings, Codex, chat and performance sampling are client concerns; server actions stay in the client host.

`packages/ui` exports controlled components and the shared theme. It has no game-package imports, network requests, persistence, gameplay rules or authorization. [Its README](../../packages/ui/README.md) is the canonical component API/build guide and is imported directly into Storybook by `Guide.mdx`; preserve that integration. Storybook screens are local-state examples, not another application state machine.

Use the existing theme → MUI defaults → colocated styled rules → small local `sx` hierarchy. Shared components expose typed data/callbacks, accessible labels and keyboard behavior. GameWindow supplies modal focus trapping/restoration and draggable titles; the client supplies persisted positions through context.

`WorldList` sends clicks anywhere in an available server row to the host's join callback. Its native name button remains the keyboard target and stops click propagation to avoid duplicate joins. Full worlds and the host's disabled state block both paths; hover and pointer styling apply only to available rows.

Wardrobe composes controlled `ClassCard` components in one four-column row inside a 600px `GameWindow`. Cards own layout and MUI tooltips; the client supplies portraits, weapon/spell descriptions, rounded server stats, selection state and callbacks. Only the selection button is disabled by selection, connection or countdown state. Tooltip buttons remain focusable. Window width is configurable without changing other dialogs. Matching Ninja Adventure facesets are shipped with the client and recorded in its asset notes.

## Rendering pipeline and caches

EquipmentPanel receives item badge labels, atlas keys, optional values and explanations
from `client-new/equipment-view.tsx`, which derives them from shared equipment,
attack and ailment definitions. The shared UI bundles a transparent generated icon
atlas and presents 236px black translucent tooltips. The item popup stays beside
its slot for keyboard tab order. Badge explanations portal into the modal container
(or the page for nonmodal stories) to avoid scrolling-content clipping while
preserving modal focus and pointer interaction. Click/tap explicitly opens details;
MUI handles hover/focus and closing. Gameplay calculations stay in the host.

Drawing combines predicted local presentation with buffered remote actors. The camera centers the local player and projects the nearest wrapped copy of terrain, entities, attachments, cursor aim and navigation arrows. Sort sprites/scenery by depth; faded scenery does not change its shadow or collision behavior.

- [village-background.ts](../../packages/client/src/village-background.ts) prepares village ground, grass and static passes only after the asset batch is ready and the village is first drawn. Its cache survives joins/leaves/reconnects; grass, shadow and contact-occlusion changes invalidate affected content.
- [forest.ts](../../packages/client/src/forest.ts), [village.ts](../../packages/client/src/village.ts) and [paths.ts](../../packages/client/src/paths.ts) draw the world with visible-region and wrapped-seam handling.
- [lighting.ts](../../packages/client/src/lighting.ts) caches sprite masks/static shadows and reuses scratch canvases; moving blockers and player lights update dynamically.
- [combat-effects.ts](../../packages/client/src/combat-effects.ts), [effects.ts](../../packages/client/src/effects.ts), [danger.ts](../../packages/client/src/danger.ts) and [navigation.ts](../../packages/client/src/navigation.ts) render authoritative events, warnings and navigation.
- [critters.ts](../../packages/client/src/critters.ts) derives decorative animal motion locally. These animals are not server actors or targets.

Cull offscreen actors before expensive sprite masks/shadows, share identical sprite/grass canvases, copy presentation positions instead of whole combat state, and index hit events once per frame. Full-map redraws and cache invalidation during world joins previously caused stalls; keep startup and re-entry coverage when changing cache lifetime.

Player chat is drawn after world effects in both scenes. The rounded message box has no pointer; its bottom sits two world units above the health bar, overlaying the debuff area. Both renderers use the same placement and wrapping.

## Preferences, diagnostics and audio

[graphics.ts](../../packages/client/src/graphics.ts) and [preferences.ts](../../packages/client/src/preferences.ts) validate persisted settings and fall back to defaults. [panel-positions.ts](../../packages/client/src/panel-positions.ts) persists draggable-window placement. Rendering scale and frame caps affect presentation only; simulation/input cadence remains independent.

[PerformanceGraph.tsx](../../packages/client/src/PerformanceGraph.tsx) samples FPS and network metrics using monotonic timing. Local snapshot age excludes network transit; ping, acknowledgement delay and presentation backlog are different measurements. The shared UI graph receives data; it does not own sampling. DPS comes from authoritative damage history.

[audio.ts](../../packages/client/src/audio.ts) owns user-gesture unlock, bounded effect voice pools, per-area playlists, crossfades and hidden-tab suspension. Predicted local swing sounds stop on stale snapshots and do not replay missed attacks after reconnect. Asset provenance lives in [assets](../assets.md).

## Verification and limits

Use [startup performance](../../tests/startup-performance.spec.ts), [rendering/audio](../../tests/rendering.spec.ts), [graphics](../../tests/graphics.spec.ts), [lobby camera](../../tests/lobby-camera.spec.ts), [damage flash](../../tests/damage-flash.spec.ts), [latency](../../tests/latency.spec.ts) and the [UI suite](../../packages/ui/tests/ui.spec.ts), selecting cases relevant to the change. Validate desktop/narrow screens, keyboard focus and reduced motion for UI work.

`node scripts/benchmark-snapshots.ts` measures the snapshot presentation CPU path with 160 enemies and 300 warmed samples. It is not an end-to-end FPS result. High graphics defaults, a passing test and a successful launch do not establish hardware performance claims. A native renderer, DLSS, frame generation, depth-buffer SSAO and hardware ray tracing are outside the implemented Canvas 2D pipeline.
