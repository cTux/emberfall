# Classes and equipment

[Back to Characters and saved progress](../characters.md).

## CHAR-02 — Class selection

The wardrobe opposite the village portal switches between warrior (default), ranger, mage, and druid, only while in lobby and outside the departure countdown. Existing character saves migrate to warrior; each class keeps independent level, XP, health, playtime, and talent allocations under the same character identity (the Steam account). Switching is server-validated by proximity and saved before it becomes visible.

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
[COMBAT-05](../combat.md#combat-05--rewards-and-damage-accounting). Successful item
rolls choose weapons, armor, jewelry and class-specific off-hands. New gear rolls
rarity and stats according to [ITEM-01-03](../item-rolls.md); existing intrinsic stats
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
Gear prices rise with rarity and rolled stats; see [ITEM-04](../item-rolls.md#item-04--gear-prices).
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
cooldowns, as defined in [PROG-03](../progression.md#prog-03--talents). Characters retain
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
