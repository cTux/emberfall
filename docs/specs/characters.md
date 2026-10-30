# Characters and saved progress

Status: implemented; CHAR-05 defines production identity. Goal: Preserve character identity and independent class progress. See [current technical design](../design/network-and-persistence.md) and [Steam account design](../design/steam-accounts.md).

## CHAR-01 — Identity and recovery

Production identity belongs to a Steam account with a server-owned nickname; see CHAR-05. Legacy bearer keys remain supported only by offline imports and isolated protocol fixtures. Duplicate active sessions for the same character are rejected. The browser cannot write levels, XP, or stats. Failed loads do not silently reset characters; failed saves are reported and retried. Forest kills add 1 XP each; playtime also progresses. Dead characters revive on rejoining a village. Every return from a scene (return portal, death window, or leaving early) restores the returning player to maximum health and their companion to maximum health immediately, clearing any pending companion resurrection.

New characters start at level 1, paragon 0, with 0 XP, 100/100 HP and 0 playtime. XP automatically advances levels up to 20, then paragon, using [PROG-02](progression.md#prog-02--automatic-levels-and-paragon). Level, paragon and remaining XP persist independently per class; talent effects are not implemented. Collecting XP requires no progression choice. Mana is not a character resource, equipment stat or UI element. Older saves discard obsolete mana fields without resetting other progress.

## CHAR-02 — Class selection

The wardrobe opposite the village portal switches between warrior (default), ranger, mage, and druid, only while in lobby and outside the departure countdown. Existing character saves migrate to warrior; each class keeps independent level, XP, health, playtime, and reserved talent data under the same character identity (the Steam account). Switching is server-validated by proximity and saved before it becomes visible.

## CHAR-03 — Save lifecycle

Gold belongs to the account Storehouse, shared by every class. Collected gold goes
directly into that balance; trading spends or credits the same balance. Clients
cannot grant or overwrite gold. The existing save lifecycle applies.

Save on entry, every five seconds, on explicit leave, on disconnect and during graceful shutdown. An abrupt exit can lose up to five seconds of progress. Failed loads report an error instead of silently creating a replacement; failed saves are reported and retried. Live positions, scenes, chat, attacks and Bear state are temporary. Class changes save successfully before becoming visible. See [operations](../operations.md) for database configuration and backups.

## CHAR-04 — Equipment (new runtime)

Each class starts with exactly one equipped item: its sword, bow, fire staff or
nature staff. Equipment is saved independently per class. Older saves without
equipment receive that class's starter weapon; explicitly empty slots stay empty.
The nine slots are weapon, gloves, helmet, body armor, leggings, boots, amulet,
off-hand and ring. Off-hands accept class-appropriate shields, quivers, orbs and
nature focuses. The 20-slot backpack is saved independently per class. Older saves receive an
empty backpack. New entries are limited to 20 slots; consumables can still join an existing stack when full. Purchases and unequipping reject a full backpack. Full players do not attract item drops; other nearby players can collect them. Existing saves above 20 entries remain readable and accessible until cleared, without accepting new slots. Right-clicking compatible gear equips it, returning the old item
to the backpack; dragging backpack gear onto a compatible equipment slot does the
same. Wrong-slot items, class-incompatible gear and consumables are ignored by
equipment drops. Right-clicking equipment unequips it. Totals update immediately
from confirmed equipment. Removing the weapon disables its default attack.

Forest enemies roll equipment chance and counts by enemy type as specified in
[COMBAT-05](combat.md#combat-05--rewards-and-damage-accounting). Successful item
rolls choose weapons, armor, jewelry and class-specific off-hands. New gear rolls
rarity and stats according to [ITEM-01-03](item-rolls.md); existing intrinsic stats
are retained; prices now reflect rarity and rolled stats.
Training grants no loot. Item pickup is automatic by default and can be disabled in Settings → Gameplay; XP and gold remain automatic.
Consumables stack by type; right-click consumes one. Health potions restore 25 HP,
clamped to maximum HP, and are not consumed at full health or while dead.

Marta and Bram each have a shared backpack and independent gold balance per world,
initially 5000 gold each. Marta stocks five health potions and 200 empty bottles
at 1 gold each. Bram stocks one independently rolled item of every droppable gear
definition. Empty bottles are crafting resources that stack to 200; they cannot
be consumed or equipped. Every 30 minutes, both merchants' regular stock and gold
reset to these initial amounts, preserving each merchant's buybacks. The shared
refresh deadline persists across restarts; overdue stock refreshes once when
loaded. Each merchant's successful refresh posts a yellow world system message.
Existing regular gear stock moves from Marta to Bram with IDs and rolls preserved;
Marta's existing gold and buybacks remain accessible. Both merchants buy any
backpack item and offer the same trading controls.
Gear prices rise with rarity and rolled stats; see [ITEM-04](item-rolls.md#item-04--gear-prices).
Buy shows regular stock; Buyback shows that merchant's latest 20 sold
entries, newest first, shared by everyone in the world. Older entries expire.
Sold items never enter regular stock. Sell all, beside the player's gold balance,
sells every backpack item (including consumable stacks) in one atomic action;
equipped items remain equipped. If the selected merchant cannot afford the entire sale, nothing changes.
Right-click sells one player item or buys one merchant item. Hold Shift to trade
up to 10 items from the selected stack; hold Ctrl to trade the whole selected stack,
including Buyback. Ctrl takes priority when both are held. Enter/Space and vendor
drops use the same modifiers. The listed per-item price scales with the quantity;
the entire trade is rejected if the buyer lacks gold or inventory space.
Each transfer updates both inventories and gold balances
atomically. Insufficient gold, stale items, incompatible gear and trading outside
the selected merchant's village interaction range are rejected without changing saved state.
Merchant stock and gold survive restarts for worlds that still exist.

All equipped items contribute to one shared stat calculation. Weapons supply
power, attacks per second, automatic/manual range, damage type and critical stats;
other gear can add power, cadence, range, health and armor. Gear cadence and talent
speed bonuses add into one recovery rate for both attack and talent ability
cooldowns, as defined in [PROG-03](progression.md#prog-03--talents). Characters retain
innate 100 maximum health, plus gear bonuses. Armor starts at
zero and mitigates incoming damage by `armor / (100 + armor)`. Unequipped
characters cannot attack. The server owns equipment and combat results.

Inventory has Equipment and Stats tabs in the external left rail used by Codex
and NPC windows. The backpack and gold stay visible in both tabs. Equipment uses
equal square cells in the base three-column, four-row layout, with consistent gaps
and aligned edges; each equipment cell is 1.2 times the backpack cell per side.
Stats shows calculated totals including equipped bonuses, without duplicate
“Bonus…” rows.

The Stats tab shows one Range row for the current targeting mode:
automatic targeting uses automatic range, and manual targeting uses manual range.

Starter weapons retain existing power/range/cadence and have a 5% critical chance
for 150% damage. Warrior damage is physical, Mage fire, Ranger poison and Druid
nature. Each direct hit rolls independently; splash scales from weapon power and
can crit. Ailment ticks and Bear attacks do not inherit weapon critical rolls.

## CHAR-06 — Storehouse

The village Storehouse provides three private storage tabs shared across the
account's classes, each with 40 item slots, and one shared gold balance. New accounts
receive empty storages named Storage 1, Storage 2 and Storage 3. Names, contents and
gold survive class changes, world changes, reconnects and server restarts.
Existing per-class gold balances are summed once. Old storage contents are merged
tab by tab, prioritizing the active class; overflow returns to the original class's
backpack, remaining accessible above its normal limit until cleared. Active-class
custom names take priority, then the first existing custom name. Migration never
discards items or gold; unsafe numeric totals reject loading instead of truncating.
Right-clicking a tab renames it to a trimmed, nonempty name with no character-count limit.
Right-clicking an item transfers its entire stack between the selected storage and
the backpack. Consumables join existing stacks even when the destination is full.
Full destinations, stale items, invalid tabs and actions while dead, in a scene or
away from the Storehouse are rejected. Transfers and renames save successfully
before becoming visible; failed saves preserve both inventories.

Items can also be dragged between the backpack and Storehouse, or directly onto
another storage tab. Storage-to-storage transfers obey the same capacity, stack,
proximity and save-before-publish rules. Vendor dragging invokes the existing
one-item buy/sell operation and spends or credits account gold.

## CHAR-05 — Steam accounts and nickname

Players log in through Steam. After the first successful login, show a nickname
dialog prefilled with their Steam display name. Confirming saves the chosen game
nickname on the server. Returning players who completed this step do not see it
again; an interrupted first setup remains pending on the next login.

Settings has an Account tab with the current game nickname and an action to change
it. That action opens the same nickname dialog, prefilled with the saved game
nickname. Cancelling an edit preserves the previous value; failed saves leave the
dialog open with a retryable error. Subsequent Steam display-name changes do not
overwrite the chosen game nickname.

Steam identity and game nickname are separate: changing the nickname preserves
the account, character, class progress and equipment. Logging into the same Steam
account from another browser recovers its linked character. Nicknames are never
credentials. Existing duplicate-active-character protection remains in force.

Nickname confirmation is required before joining a world. Names must contain 3–12 ASCII letters, digits or underscores, without spaces. Duplicate
names are allowed; party commands reject ambiguous matches. Existing invalid names
require a rename before admission, preserving account identity and saves. Successful renames update live players. Steam names outside
the game limit remain visible as the initial draft with validation feedback,
rather than being silently truncated to the game limit. Profile lookup failure
allows manual entry without treating the Steam login as invalid. Closing first
setup signs out; cancelling a later edit preserves the saved nickname.

Steam accounts start fresh. Existing browser saves are preserved and never linked
or merged automatically. The new executable requires Steam configuration and has
no guest fallback. CHAR-01 describes shared character behavior and the isolated
legacy-protocol test fixtures. Account sessions expire after seven days; signing
out revokes the session and closes its active connection.

Steam acceptance:

- First Steam login opens the dialog with the Steam display name; confirmation
  persists the chosen nickname and marks setup complete atomically.
- Reload during unfinished setup opens the dialog again; completed setup is
  skipped on subsequent logins, including on another device.
- Settings → Account opens the same dialog with the saved nickname. Save updates
  the account; cancel or a failed save does not change it.
- Renaming or changing the Steam profile name never creates a new character or
  resets progress. The saved game nickname survives login and server restart.
- Forged identities, expired sessions and another account's rename requests cannot
  read or mutate the account. Concurrent active character sessions remain rejected.

## Acceptance — identity and shared character behavior

- Restart with the same character key preserves name and each class’s XP, level, HP, playtime and reserved talent data.
- Older single-class saves load as Warrior; missing classes start fresh without overwriting existing class progress.
- Class selection fails outside wardrobe range, in the forest or during departure countdown.
- Returning by portal, early exit or death restores maximum HP and an existing Bear, cancelling pending resurrection.
- A second live session cannot use the same character key. Missing/corrupt saves surface an error.
- XP collection does not open an upgrade selector or block movement; see [PROG-01](progression.md#prog-01--uninterrupted-progression).

Evidence: [characters.test.ts](../../packages/server/src/characters.test.ts), [classes.test.ts](../../packages/server/src/classes.test.ts).

Steam evidence: [server account tests](../../packages/server/src/accounts.test.ts) and
[browser account tests](../../tests/accounts.spec.ts).

Gathered logs, sticks, leaves, rocks and stones are saved resource items. Each
resource stack holds at most 200 items; overflow starts another slot. Gear and
weapons remain individual entries. Existing consumable stacking is unchanged.
