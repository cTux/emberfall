# Preferences, audio and verification

[Back to Client presentation and shared UI](../presentation.md).

## Preferences, diagnostics and audio

`hideOtherPlayerDamageNumbers` defaults to true and accepts saved booleans.
Both forest and training pass the local player ID to `drawDamageNumbers` while
enabled; the shared renderer draws only events owned by or targeting that player.
Filtering leaves authoritative events and DPS data intact. Disabling the preference
omits the ID and renders every scene event, subject to the master `damageNumbers` toggle.

[graphics.ts](../../../packages/client/src/graphics.ts) and [preferences.ts](../../../packages/client/src/preferences.ts) validate persisted settings and fall back to defaults. DPS, FPS and latency visibility default to false; saved boolean choices override those defaults. [panel-positions.ts](../../../packages/client/src/panel-positions.ts) persists draggable-window placement. Rendering scale and frame caps affect presentation only; simulation/input cadence remains independent.

[PerformanceGraph.tsx](../../../packages/client/src/PerformanceGraph.tsx) samples FPS and network metrics using monotonic timing. Local snapshot age excludes network transit; ping, acknowledgement delay and presentation backlog are different measurements. The shared UI graph receives data; it does not own sampling. `PerformanceMonitor` uses caption typography, one readings/scale row, a shallow SVG plot and one legend row. The client constrains the draggable panel to 224 pixels wide; sampling and saved visibility are unchanged. DPS comes from authoritative damage history. Arena renders its meter only when the saved `dps` preference is enabled, independently of the performance graph; hiding it does not affect damage tracking or its saved panel position.

[audio.ts](../../../packages/client/src/audio.ts) owns user-gesture unlock, bounded effect voice pools, per-area playlists, crossfades and hidden-tab suspension. Predicted local swing sounds stop on stale snapshots and do not replay missed attacks after reconnect. Asset provenance lives in [assets](../../assets.md).

## Verification and limits

Use [rendering/audio](../../../tests/rendering.spec.ts) and the [UI suite](../../../packages/ui/tests/ui.spec.ts), selecting cases relevant to the change. Validate desktop/narrow screens, keyboard focus and reduced motion for UI work.

For measured frame budgets use the opt-in browser scenario in [development](../../development.md). The original snapshot benchmark is retired. Passing tests and builds do not establish hardware performance or subjective audio quality.

Action-bar assignment uses LMB and a host-owned icon menu with a generated red clear
tile. RMB invokes controlled auto-cast callbacks. WeaponActionBar saves per-ability
choices in browser preferences and requests ready casts at 250 ms intervals using
the existing server-validated command. The global auto-attack setting gates these
requests. The shared UI renders an SVG dashed border with reduced-motion support.
