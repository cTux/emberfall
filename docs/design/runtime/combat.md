# Combat, equipment and talents

[Back to Game runtime](../new-runtime.md).

## Equipment and typed damage

`core/mods/base.mod.ts` registers slots, gear, stats and per-class starter IDs.
Core's bound equipment rules derive totals from equipped IDs;
simulation, prediction and presentation consume that calculation. Equipment lives
in per-class progress. Saves without equipment migrate at decode; invalid items,
incompatible slots and wrong-class gear are rejected. Existing entity payloads
carry equipment and typed/critical hit events without client stat messages.

Weapon power replaces hardcoded direct damage; fire splash keeps its one-third
ratio. A shared weapon-hit path rolls criticals on the server. Ailments explicitly
carry their damage type and never reroll criticals; Bear remains physical. Armor
mitigation applies to incoming player hits. Max HP synchronizes from equipment
at authoritative lifecycle/tick boundaries and clamps current health.

Enemy damage events carry optional `ownerId` from the authoritative hit path,
including attributed ailments and companion hits, through the existing event
payload. `damage-text.ts` groups detached events by owner, target and damage type
in fixed 10 ms windows anchored to the first hit, shared by both render paths.
It copies events for presentation, leaving combat events and other hit effects intact.
Missing ownership bypasses grouping; any critical hit marks the displayed sum critical.

The shared renderer derives pop scale, eased rise, lateral drift and final fade
from the first event's server timestamp. Event IDs select one of five stable
horizontal lanes; rebuilding a snapshot cannot restart an animation or change
its lane. Critical text has a larger base font. Transform scaling keeps font
styles constant during animation, and a dark outer stroke supports readability
over scenery. Projection remains owned by each area's wrapped camera. No local
event queue, timers or combat mutations are needed.

The UI exports a controlled EquipmentPanel with positioned slot views and stat
rows, with no game-package dependency. Client configuration maps slots to grid
coordinates and fallback images, passing definitions/totals into the UI. The
existing GameWindow supplies dragging, focus and close behavior. The client owns
the Equipment/Stats selection through ChapterTabs, which portals its vertical
tabs into GameWindow's external rail. The backpack remains mounted beside the
active panel. EquipmentPanel renders only the supplied slots or stat rows;
fixed equal tracks keep base gear aligned in three columns and four rows.
The shared backpack size is 44px; equipment cells use 1.2 times that size (52.8px)
in both dimensions. The client presents core's calculated totals without repeating
the raw equipped bonuses as separate rows.

## Damage meter

The authoritative `core/class-combat.ts` hit path accumulates each player's
`damageMeter` totals and per-ability damage, alongside the bounded five-second
hit history used for DPS. Weapon, companion, ailment and talent callers supply
the damage source. `tickTraining` refreshes DPS for all players, including those
in forest runs. Class changes discard the previous class's temporary meter.
The existing per-player JSON projection carries the additive contract; saves
exclude it. `client/DamageMeter.tsx` filters the current party, computes shares,
sorts rows and owns the selected character. Its header reuses the persisted
`panel.dps` drag position; row buttons do not initiate dragging. Server tests
cover attribution and overkill; desktop browser tests cover replicated totals,
party filtering, breakdown navigation and the existing visibility preference.

`core/combat/meters.ts` owns effective healing and received-damage totals with
bounded five-second histories. Talent heal callers pass the caster and simulation
timestamp; consumables credit their user. Enemy combat records character HP lost
after mitigation and lethal caps. `tickTraining` refreshes both rates for every
connected player and discards mismatched class totals, including forest players.
The optional `healingMeter` and `receivedMeter` contracts use the same temporary
player projection and stay outside saved progress. The client's Material UI menu
selects party totals; only Damage done retains ability breakdowns. Its button
supports keyboard access, and open menus suppress gameplay input.

## Talent configuration

[PROG-03](../../specs/progression.md#prog-03--talents) uses core's immutable
[class talent catalog](../../../packages/core/src/talent-catalog.ts), allocation
rules and registered ability definitions. Three columns expose ten level-gated,
two-rank nodes per class. Available points equal normal level minus spent ranks.
Versioned per-class save normalization refunds old allocations once and repairs
invalid or over-budget records without changing other progress.

Learning, equipping and bullseye resets use detached mutations saved before
publication. Four saved slots reference learned ability node IDs. Cooldowns are
keyed by ability ID, so reassignment does not bypass recovery. Reset clears
assignments and transient combat effects after the transaction succeeds.

`talent-effects.ts` owns authoritative direct hits, scheduled pulses, ailments,
consumption, companion commands, healing, barriers, control and triggered effects.
The shared forest/training tick executes scheduled effects and invalidates them
on death, class/scene departure or reset; pause/resume preserves their timing.
Damage and deaths use the existing shared hit/reward path. Training grants no
rewards. Confirmed explosion events carry the talent class and column for animated
cast art and optional particles in both renderers. These visuals never apply
client damage. The UI supplies independent columns and themed rank tooltips;
right-click/F2 assignment uses the existing action bar.
