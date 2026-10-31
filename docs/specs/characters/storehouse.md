# Account Storehouse

[Back to Characters and saved progress](../characters.md).

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
