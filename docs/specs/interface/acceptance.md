# Interface acceptance

[Back to Controls, interface and audio](../interface-and-audio.md).

## Acceptance

- Drag an item between the visible backpack and Storehouse or vendor inventory.
  Storehouse moves whole stacks; vendor drops buy/sell one item, up to 10 with
  Shift, or the whole selected stack with Ctrl (which takes priority over Shift).
  The same modifiers apply to vendor RMB and Enter/Space, including Buyback.
  Prices scale per item. Dropping onto another storage tab moves the whole stack to that tab;
  dropping a backpack item onto a storage tab deposits there. Cancelled drags,
  same-inventory drops and unrelated browser drags do nothing. Server rejection
  (full destination, insufficient gold, stale item or invalid proximity) preserves
  items and gold. RMB and Enter/Space remain alternatives. Dragging does not equip
  or consume items, reorder slots or move merchant stock between Buy/Buyback.

- In the new runtime, all four classes receive only their base weapon, including
  migrated saves. All equipped items affect combat and the displayed totals.
- Equipment supports non-Latin `KeyI`, drag/reopen, Escape, typing suppression,
  keyboard tooltips and narrow viewports.
- Critical boundaries, fractional damage, training/forest, saves and network
  reconstruction preserve damage type and critical metadata.

- Toggle F/G once per press, ignore typing/repeats, persist choices and stop held manual casting after release, blur or hiding the tab.
- Drag and reopen windows, navigate Codex tabs with arrows/Home/End, close with Escape and restore focus.
- Boss HUD stays readable offscreen and disappears on defeat/return. The DPS meter toggles independently of performance traces, applies immediately and retains its saved visibility after reload.
- Graph lines distinguish ping, input acknowledgement and local snapshot age; missing samples leave gaps.
- Unlock audio with a gesture, transition through all three music areas, repeat playlists, mute independently and pause hidden tabs.
- Check desktop/narrow layouts, reduced motion, non-Latin movement, large numbers and context-menu suppression.

Evidence: [dps-meter.spec.ts](../../../tests/dps-meter.spec.ts), [hud.spec.ts](../../../tests/hud.spec.ts), [keyboard-layout.spec.ts](../../../tests/keyboard-layout.spec.ts), [rendering.spec.ts](../../../tests/rendering.spec.ts), [ui.spec.ts](../../../packages/ui/tests/ui.spec.ts).
