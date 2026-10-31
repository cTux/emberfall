# Combat controls and input

[Back to Controls, interface and audio](../interface-and-audio.md).

## UI-02 — Combat controls

Holding either Alt key suppresses browser Alt behavior. After holding Alt for more
than 0.5 seconds, it shows thin green
outlines on all visible interactive objects in village and forest, regardless of
interaction range. This includes functional buildings, Marta, cats, portals and
non-depleted gathering resources, and players eligible for Invite, Join or Accept
party actions. Alt-modified text entry remains available for keyboard layouts that
use AltGr. Releasing Alt restores normal yellow hover
outlines. Losing focus or hiding the tab clears the held state; dialogs and text
entry suppress the highlights. Alt does not change interaction range or actions.

When an interaction is available, a compact prompt directly below the local
player's name shows a circular E badge and the interaction's short name (for
example, Wardrobe, Gather tree or Return to village). It follows the same target
and confirmed range as the E action in village and forest, including wrapped
seams. It disappears when no action is available, the player dies, or a modal or
text entry blocks gameplay input. Other players do not display this prompt.
Speech bubbles draw above the prompt wherever they overlap.
During gathering the player prompt is replaced by the thin yellow timed-activity
bar above the resource, with a green zone and white indicator, without text above
or below it (see [VILLAGE-07](../scenes/gathering.md#village-07--gathering)).
Settings → Gameplay includes **Hide interact hint during combat**, enabled by
default, including for existing saved preferences. It hides only gathering prompts
in active forest scenes and while inside a village training zone with active
training. Other prompts and E/click gathering remain available. Disabling it shows
gathering prompts during combat; changes apply immediately and persist locally.
The prompt uses a dark rounded capsule with a thin bronze outline. Its left end
and the raised E button are concentric, with equal left, top and bottom inset.
The button has a filled shaded face, an evenly thick gold rim and a separate drop
shadow. Highlights provide depth without changing the circular rim's thickness.
The badge is visually separate from the message so a controller glyph can replace
it later; controller support is outside this change.

The client uses an original WoW-inspired ivory/bronze cursor set with ember accents:
a pointing armored glove for the default cursor, a brighter glove for actionable UI hover,
text entry, open/closed drag hands and a barred disabled state. The glove's
fingertip is the click hotspot. In
active forest combat or village training with a weapon equipped, hovering a living
enemy shows a sword; disabling auto-target shows a crosshair instead. Holding LMB
shows the active attack cursor. Death shows the barred cursor. Preview, inactive
combat, open dialogs and focus loss restore the default cursor. These indicators
do not select enemies, change targeting or make world objects clickable.
Settings → Gameplay includes **Custom cursor** (enabled by default) and **Cursor size**:
Small (32 px), Medium (48 px, default) and Large (64 px). Both apply immediately and
persist locally. Disabling custom cursors restores native system cursors for all
states, including combat and portaled controls; the size choice is retained while disabled.

Settings → Gameplay includes saved Auto-attack (F) and Auto-target (G) toggles, both enabled by default. Hotkeys ignore repeated presses, text entry, and open dialogs. With auto-attack disabled, holding LMB casts the class default spell once per one-second base cooldown. Releasing, opening a dialog, hiding the tab, or losing focus stops requesting casts; an already-started swing finishes without resetting its cooldown. Training-area restrictions still apply.

With auto-target disabled, melee aim follows the cursor and ranged spells fly straight around the cursor direction for up to 1000 units, even without an enemy. With auto-target enabled, ranged spells aim around the nearest living enemy in default range. Attack range is not drawn as a ground circle, including when the cursor is beyond spell range. Cursor projection follows the village and wrapped forest cameras. Validated combat input is separate from movement; the server owns cooldowns and expires held-LMB input after 250 ms without a heartbeat. Local presentation shares aim, spread and projectile motion with authoritative combat.

## UI-05 — Input and display details

Movement uses physical keyboard codes, so WASD works with non-Latin layouts. Text entry and open modal dialogs suppress movement and gameplay hotkeys. The game suppresses native text selection and the browser context menu on its surface. Modal keyboard focus, Escape and focus restoration use the shared UI components. Visible fractional stats, XP, DPS and damage are rounded to whole numbers without changing the underlying values; status meters retain actual units for assistive technology.

Screen-edge arrows point to living teammates in the same area, the boss and return portals using wrapped distances. Enemy deaths retain their sprite and fall/fade for 0.7 seconds. See [combat readability](../graphics/combat.md#graphics-04--combat-readability) for debuff icons and weapons.
