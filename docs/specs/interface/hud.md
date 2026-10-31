# HUD, windows and tactics

[Back to Controls, interface and audio](../interface-and-audio.md).

## UI-01 — HUD and windows

The optional DPS meter and FPS/latency monitor float independently of the party
frames. Enabling or disabling them never moves party frames. With no saved drag
offset, each widget starts at the viewport center; dragging retains its local
offset across toggles and sessions, clamped to the viewport on resize.

While in a world, a fixed bottom-center action bar shows the equipped weapon's
base ability with the same ability icon as Wardrobe, followed by four empty ability
slots. Unequipping the weapon hides only the base-ability slot. Every slot retains
the same translucent black
background and brown border as game windows. Abilities show a clockwise radial
cooldown sweep and remaining seconds, clearing when ready. The display follows
confirmed attacks and equipment cooldown stats in village training and forest;
existing auto-attack and held-LMB controls still cast the ability. The bar stays
centered on narrow screens, with chat above it when space is limited.
Each slot shows its hotkey at bottom right: a left-mouse-button icon for the base
ability and 1–4 for the four empty slots. A target icon sits at the base slot's
bottom left. The mouse and target icons independently glow and pulse while
auto-attack and auto-target are enabled, reflecting saved settings and F/G toggles.
Reduced motion keeps a steady glow. Indicators remain visible over cooldowns;
empty slots remain unassigned and do not cast abilities. LMB opens an icon picker
with an equally sized generated red clear tile. RMB toggles auto-cast. Enabled
abilities show marching dashed borders (steady with reduced motion). Auto-attack
is the master switch, preserving individual talent choices while off. Hover, keyboard focus or
touch on an equipped ability opens a custom tooltip with its name, equipment
cooldown and description, reusing the Talents description for learned abilities
and the Wardrobe description for the base attack. Casting and automation instructions
are omitted from tooltips; slot indicators still show their state. Tooltips share game windows' translucent
black surface, brown border, square corners and theme typography.

![Verified in-game talent action-bar tooltip with description](../../images/action-bar-description.png)

All game windows use compact, lighter title bars, wardrobe-brown borders and thin scrollbars. Every tabbed window places its tabs vertically outside its left border, with left-rounded brown frames and a filled gold-accented selected state. The rail moves with the window, stays within the viewport and scrolls independently of the content. Up/Down, Home and End navigate tabs. Backpack slots use matching brown borders and dark wood backgrounds, with 20 slots shown by default.
The trader has Buy and Buyback tabs, with 20 Buyback slots. A small Sell all icon
button sits at the top-right of the player's backpack, opposite the gold balance.

The arena fills the viewport with an aspect-preserving camera centered on the local player. Codex, settings and exit are compact controls; the bottom-right colored circle reports connection status. F1 opens Codex and Escape opens Settings when no window or text input is active, including before joining a world. Each window's opening hotkey also closes that window; Escape closes the current window first. Holding a hotkey does not repeatedly toggle its window, and F1 suppresses browser help even while a window is open. The top-right HUD orders Inventory, Talents, Tactics, Codex, optional Portal vote, Settings and Leave world. Inventory uses a bag icon and Talents uses magic sparkles. I, N, T, F1 and Esc appear as small badges below the matching icons and in tooltips; actions without hotkeys omit badges. Leaving remains last, after Settings. HUD tooltips show each action's available hotkey; leaving uses the explicit exit control. Codex/settings use draggable modal dialogs and suppress movement while open. Settings can toggle ambient particles. Nicknames belong to Steam accounts; see CHAR-05.

Party cards show server-owned `Nickname, lvl N` inside the HP bar, adding `P` and the paragon level when positive. A thinner blue XP bar directly below health shows current/required XP using the shared progression formula. The class portrait matches the health bar height; a crown marks the party leader in its top-right corner and a dimension icon marks players in another area in its top-left corner. Icons retain accessible labels and away players stay dimmed. Thin health bars also appear beneath player names.

When a player has a battle companion, their party card shows a smaller portrait and HP bar directly below the player's row. It displays the companion's name and confirmed current/maximum HP, including zero HP while defeated, and disappears when the player no longer has a companion.

Party health bars use 60% of their previous width, including the companion row. In the new runtime, each player's confirmed coin balance appears immediately after their HP bar with a coin icon. Amounts use compact lowercase suffixes (13, 1k, 3m), at most one decimal, and an accessible label with the full amount.

Wardrobe shows all four classes in one compact row. Each card has its matching character portrait above separate starting-weapon and base-spell squares, then level, XP, maximum HP, Power and a selection button. Power uses calculated class equipment stats. Weapon and spell details open on hover, keyboard focus or touch and explain the current attacks, range, cooldown and effects. There is no introductory or departure helper text. Class selection retains server validation, per-class progress and countdown restrictions; inspecting details remains available for selected or unavailable classes.

During an active boss fight, forest players see a fixed top-center boss HUD with the boss name (The Hollow Warden), orange health bar and current/max HP, even when the boss is offscreen. It replaces the boss objective label and disappears on defeat or returning to the lobby; the scene-complete message then appears.

Codex uses the shared forest theme with chapter tabs for controls, worlds and party, combat, the boss, character persistence, classes, and credits. Every chapter uses short sections, readable lists where appropriate, and relevant game artwork with accessible descriptions. Illustrations fit narrow screens without horizontal scrolling. Tabs support arrow keys, Home, and End; the book remains draggable and closable and keeps its size and position when switching chapters.

### Tactics

Tactics (T) appears immediately after Talents in the in-world HUD. Its draggable
window uses the same three external left-side tabs as Codex: Offensive, Defensive
and Positioning. T toggles it, Escape closes it, held keys do not repeat, and text
entry or another modal prevents accidental opening. The world continues while it
is open; gameplay input and automatic talent requests follow existing modal rules.

Settings apply immediately after server confirmation and save per character class.
Older saves without tactics retain nearest-target attacks, lowest-health healing,
and Balanced companion behavior. Priority rows move with labeled up/down buttons;
the first rule wins and later rules break ties, retaining entity order on full ties.
Only living eligible targets in wrapped range participate. Manual cursor aiming,
self-centered effects and fixed-recipient heals keep their dedicated behavior.

Offensive orders Nearest enemy, Lowest health %, and Elite / boss first (bosses
before elites before ordinary enemies). Keep current target retains a valid target
within the current ability's range; it defaults off to preserve existing behavior.

Defensive orders Lowest health %, Players before companions, and Self before
allies. Include companions defaults on. Auto-heal below offers Any missing health,
90%, 75%, or 50% HP. The threshold gates automatic targeted-heal casts and automatic
Healing Grove casts; it does not block manual casts or later healing pulses.
Party, area, run, connection and range checks always precede preferences.

Positioning configures the current class's companion. Balanced preserves nearby
hunting; Aggressive pursues across the preferred owner radius; Protect owner
restricts engagements to 100 units around the owner; Passive follows without
attacking. Close / Medium / Far set the preferred combat radius to 100 / 200 / 300
units. Balanced engagements cap at the existing 200 units. All stances retain the
500-unit teleport tether, return behavior, tree avoidance and resurrection rules.
Target mode follows offensive priorities, assists the owner's current valid target
(falling back to priorities), or chooses enemies nearest the owner. Avoid telegraphs
and projectiles defaults on and controls the existing hazard avoidance. Companion
controls are disabled for classes without a companion, with an explanation.

![Verified Tactics window with external left-side tabs](../../images/tactics.png)
