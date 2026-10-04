# Controls, interface and audio

Status: implemented baseline. Goal: Readable feedback and usable controls while the server owns the game rules. See [technical design](../design/presentation.md).

## UI-01 — HUD and windows

The arena fills the viewport with an aspect-preserving camera centered on the local player. Codex, settings and exit are compact controls; the bottom-right colored circle reports connection status. Codex/settings use draggable modal dialogs and suppress movement while open. Settings can toggle ambient particles. Nicknames persist in browser localStorage; when storage is blocked the session still works.

Party cards show server-owned name, level and HP/MP, with host/local markers and dimmed players in the other area. Bear has HP but no mana. Thin health bars also appear beneath player names.

Wardrobe shows all four classes in one compact row. Each card has its matching character portrait above separate starting-weapon and base-spell squares, then level, XP, maximum HP/MP and a selection button. Weapon and spell details open on hover, keyboard focus or touch and explain the current attacks, range, cooldown and effects. There is no introductory or departure helper text. Class selection retains server validation, per-class progress and countdown restrictions; inspecting details remains available for selected or unavailable classes.

During an active boss fight, forest players see a fixed top-center boss HUD with the boss name (The Hollow Warden), orange health bar and current/max HP, even when the boss is offscreen. It replaces the boss objective label and disappears on defeat or returning to the lobby; the scene-complete message then appears.

Codex uses the shared forest theme with chapter tabs for controls, worlds and party, combat, the boss, character persistence, and credits. Tabs support arrow keys, Home, and End; the book remains draggable and closable.

## UI-02 — Combat controls

Settings → Gameplay includes saved Auto-attack (F) and Auto-target (G) toggles, both enabled by default. Hotkeys ignore repeated presses, text entry, and open dialogs. With auto-attack disabled, holding LMB casts the class default spell once per 700 ms cooldown. Releasing, opening a dialog, hiding the tab, or losing focus stops requesting casts; an already-started swing finishes without resetting its cooldown. Training-area restrictions still apply.

With auto-target disabled, melee aim follows the cursor and ranged spells fly straight around the cursor direction for up to 1000 units, even without an enemy. With auto-target enabled, ranged spells aim around the nearest living enemy in default range. Beyond default spell range, a transparent circle marks warrior 88, ranger 1000, or mage/druid 250 units (1000 for cursor-aimed mage/druid). Cursor projection follows the village and wrapped forest cameras. Validated combat input is separate from movement; the server owns cooldowns and expires held-LMB input after 250 ms without a heartbeat. Local presentation shares aim, spread and projectile motion with authoritative combat.

## UI-03 — Network and performance feedback

Gameplay settings can independently show FPS and server latency together at the top left. Latency is a measured WebSocket ping/pong round trip in milliseconds, sampled every two seconds with a monotonic client clock. The toggle persists; a missing or disconnected measurement shows a dash.

The network graph plots ping, input acknowledgement delay, and local snapshot age as separate colored lines on the same millisecond axis. Input acknowledgement delay is the latest consumed command's send-to-snapshot delay, or the oldest outstanding command's age if greater. Local snapshot age includes time since receipt and interpolation backlog, but excludes network transit; it uses the monotonic client clock and differences between server timestamps. A low ping does not imply fresh movement acknowledgements or snapshots. Missing samples leave gaps in each line.

The top-left performance panel overlays a green FPS trace and blue round-trip latency trace on one 30-second scrolling graph, sampled twice per second. The duplicate numeric caption is omitted; color-coded axis ranges (for example 0–240 FPS and 0–100 ms) describe the scales, not current readings. Both traces are enabled by default, with compact 8-pixel side padding. Each trace retains its own saved visibility toggle; disabling both hides the panel. A DPS meter sits between the graph and party list (and stays visible when the graph is hidden). It shows your actual enemy damage over a rolling five-second window, divided by five, including damage over time and the companion; overkill is excluded. The server calculates it from the shared hit path, and it returns to zero after five seconds without damage.

## UI-04 — Settings and music

Settings groups are Gameplay, Graphics and Sound. Preferences persist locally; malformed or unavailable storage falls back to defaults. Gameplay includes auto-attack, auto-target, blood puddles, damage numbers and performance visibility. Audio has independent music/effects enable switches and volumes; defaults are 0.22 music and 0.35 effects.

[FREE fantasy music by TimberwolfGames](https://timberwolfgames.itch.io/free-fantasy-music) supplies six CC0 tracks: Intro / Theme_001 (start), In The Woods / Adventure (village), and Trials / Wastelands (combat). Each two-track playlist repeats indefinitely and resumes its selection when returning to an area. Music crossfades between areas, starts after a user gesture, pauses in hidden tabs, and has independent enable/volume controls. Sampled effects use bounded voice pools and the existing CC0 Ninja Adventure pack. Original licenses and filenames are in `packages/client/public/audio/CREDITS.txt` and `CC0.txt`.

## UI-05 — Input and display details

Movement uses physical keyboard codes, so WASD works with non-Latin layouts. Text entry and open modal dialogs suppress movement and gameplay hotkeys. The game suppresses native text selection and the browser context menu on its surface. Modal keyboard focus, Escape and focus restoration use the shared UI components. Visible fractional stats, XP, DPS and damage are rounded to whole numbers without changing the underlying values; status meters retain actual units for assistive technology.

Screen-edge arrows point to living teammates in the same area, the boss and return portals using wrapped distances. Enemy deaths retain their sprite and fall/fade for 0.7 seconds. See [combat readability](graphics.md#graphics-04--combat-readability) for debuff icons and weapons.

## UI-06 — Equipment inspection (new runtime)

The Equipment HUD action and physical `KeyI` open a draggable equipment dialog in
village and forest. `I` toggles it closed; Escape and the close button also close
it. Ignore repeats, modified shortcuts, text entry and other open dialogs. Use
the existing modal focus, movement suppression and persisted drag-position rules.

The left side has three columns: weapon/gloves; helmet/body armor/leggings/boots;
amulet/off-hand/ring. Slots have no border. Empty slots show a translucent fallback
image; equipped weapons show their original icon. Hover, focus or touch exposes
item stats or the accepted gear types. Character stats derived from all equipment
appear on the right, stacking below the slots on narrow screens.

Normal outgoing damage numbers use physical parchment, fire orange, poison lime
and nature green. Critical numbers override the type color with white text and a
thick red outline. Server events carry damage type and critical outcome in both
training and forest; the existing damage-number preference applies.

## Acceptance

- In the new runtime, all four classes receive only their base weapon, including
  migrated saves. All equipped items affect combat and the displayed totals.
- Equipment supports non-Latin `KeyI`, drag/reopen, Escape, typing suppression,
  keyboard tooltips and narrow viewports.
- Critical boundaries, fractional damage, training/forest, saves and network
  reconstruction preserve damage type and critical metadata.

- Toggle F/G once per press, ignore typing/repeats, persist choices and stop held manual casting after release, blur or hiding the tab.
- Drag and reopen windows, navigate Codex tabs with arrows/Home/End, close with Escape and restore focus.
- Boss HUD stays readable offscreen and disappears on defeat/return. DPS stays visible with performance traces disabled.
- Graph lines distinguish ping, input acknowledgement and local snapshot age; missing samples leave gaps.
- Unlock audio with a gesture, transition through all three music areas, repeat playlists, mute independently and pause hidden tabs.
- Check desktop/narrow layouts, reduced motion, non-Latin movement, large numbers and context-menu suppression.

Evidence: [combat-controls.spec.ts](../../tests/combat-controls.spec.ts), [hud.spec.ts](../../tests/hud.spec.ts), [latency.spec.ts](../../tests/latency.spec.ts), [keyboard-layout.spec.ts](../../tests/keyboard-layout.spec.ts), [number-display.spec.ts](../../tests/number-display.spec.ts), [context-menu.spec.ts](../../tests/context-menu.spec.ts), [rendering.spec.ts](../../tests/rendering.spec.ts), [ui.spec.ts](../../packages/ui/tests/ui.spec.ts).
