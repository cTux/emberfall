# Inventory, trading and Storehouse UI

[Back to Controls, interface and audio](../interface-and-audio.md).

## UI-06 — Inventory and trading (new runtime)

The Inventory HUD action and physical `KeyI` open a draggable inventory dialog in
village and forest. `I` toggles it closed; Escape and the close button also close
it. Ignore repeats, modified shortcuts, text entry and other open dialogs. Use
the existing modal focus, movement suppression and persisted drag-position rules.
New-runtime windows use a wardrobe-brown solid border, with no divider under the title.

The Inventory window opens with physical KeyI or the HUD action. Compact square backpack slots use item art when available and default equipment-slot art otherwise. Stack counts sit at the bottom right. Item tooltips share a compact 250px layout with the item artwork, name, type and gold price. Consumables show their effect and stack quantity; resources show their quantity without an equip/use hint. Contextual footers show equip, unequip, use, buy, sell, deposit or withdraw only where that action is available. Prices in inventories are per item. Right-click activates an item; Enter or Space provides the same action for keyboard users. Marta and Bram open two compact backpacks, the merchant's on the left and the player's on the right, each with the same gold display used in the HUD.

Gear that the current class cannot equip shows a red “Your class cannot equip
this item.” line in its tooltip, including trader and storage inventories. Its
normal backpack tooltip omits the equip hint; trade and storage action hints stay
available. The warning updates when the current class changes.

![Verified desktop class restriction tooltip](../../images/item-equip-restriction.png)

The left side has three columns: weapon/gloves; helmet/body armor/leggings/boots;
amulet/off-hand/ring. All cells are equal squares in a fixed three-column, four-row
base grid, with aligned sides and equal gaps. Equipment cells are 50px per side,
compact enough to fit the standard Stats tab height. Switching tabs preserves the
window and backpack position and dimensions. Equipped slots retain their rarity border;
empty slots have no border. Empty slots show generated wardrobe-style
equipment icons at 15% effective opacity; equipped weapons keep their full-brightness
icon. Hover, focus or touch exposes a narrow translucent-black item tooltip with
cream text, thin brown borders and the existing game font. Weapons show prominent
Power, readable label/value rows and an amber effect heading with its explanation.
Armor highlights its Armor value. Tooltips render outside the window's scrollable
content without being clipped by its edges; unusually long details scroll inside
the tooltip. Keyboard access to detailed stat explanations stays within the modal.
Each stat row retains its weapon-specific explanation on hover or focus.
Range follows the active auto-target/cursor-aim mode. Empty slots explain accepted
gear types. Character stats derived from all equipment
appear in a separate Stats tab; Equipment is the default tab. Both tabs use the
external left rail shared with Codex and NPC windows. The 20-slot backpack and
gold remain visible on the right in either tab. Stats show calculated totals,
including gear bonuses, without separate “Bonus…” rows. Attack timing is shown
only as cooldown, without a duplicate attack-speed row.

![Verified desktop inventory Equipment tab with aligned square gear cells](../../images/inventory-equipment-tabs.png)

![Verified desktop inventory Stats tab showing calculated totals](../../images/inventory-stats-tabs.png)

Verified gameplay captures from [equipment.spec.ts](../../../tests/equipment.spec.ts).

Unequipped compatible gear includes a compact comparison against the item in the
slot that equipping would replace. Signed green gains and red losses cover base
stats and rolled bonuses, including bonuses absent from the candidate. Equal
items show “Same stats”; empty slots compare against zero. This also applies in
trading and storage. Comparison replaces the standalone primary and bonus stat
rows and has no heading; item identity, effect descriptions, price and action
remain visible. Stat labels omit the “Bonus” prefix in item details and comparisons. Consumables and class-incompatible gear omit comparison.

![Verified desktop Storybook item comparison](../../images/item-stat-comparison.png)

![Verified desktop weapon item tooltip](../../images/compact-item-tooltips.png)

Normal outgoing damage numbers use physical parchment, fire orange, poison lime
and nature green. Critical numbers override the type color with white text and a
thick red outline. Server events carry damage type and critical outcome in both
training and forest; the existing damage-number preference applies.

## UI-07 — Storehouse

Interacting with the existing village Storehouse opens three storage tabs alongside
the backpack and the account's shared gold balance. The HUD and trader show that
same balance. Each tab displays exactly 40 slots. Right-click a tab to open a rename
dialog; F2 on the focused tab provides the same keyboard action. Enter saves and
Cancel or Escape preserves the name. The compact rename dialog uses the shared game
window style and an unclipped storage-name placeholder, without validation helper text.
Names must be nonempty after trimming, with no character-count limit. Long tab names
stay on one line and end with an ellipsis; their full names remain accessible.
Right-click, Enter or Space on an item transfers the whole stack. The existing
window, item icons, tooltips, scrolling and narrow-viewport behavior are reused.
