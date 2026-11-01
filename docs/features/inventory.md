# Inventory, trading and account progress: implementation and coverage

[Feature map](../features.md). Links identify implementation and coverage; they do not claim a test was run.

## Village merchants

Village merchants: [CHAR-04](../specs/characters/equipment.md#char-04--equipment-new-runtime),
[shared trading rules](../design/runtime/inventory.md#inventory-loot-and-shared-trading),
[stock refresh](../../packages/server/src/merchant.test.ts),
[merchant validation](../../packages/server/src/merchant-pricing.test.ts) and
[desktop gear trading](../../tests/item-rarities.spec.ts). Marta stocks supplies; Bram stocks gear.

## Anvil improvements

[Anvil rules](../specs/characters/equipment.md#anvil-improvements),
[bound improvement rules](../../packages/core/src/content/improvement-rules.ts),
[picker window](../../packages/client/src/Anvil.tsx),
[rule/save checks](../../packages/server/src/item-improvement.test.ts),
[session validation](../../packages/server/src/anvil-commands.test.ts) and
[desktop verification](../../tests/anvil.spec.ts).

## Random gear rarity, stats and prices

Random gear rarity, stats and prices: [ITEM-01–04](../specs/item-rolls.md),
[core configuration](../../packages/core/src/item-stats.ts),
[instance rules](../../packages/core/src/content/rules.ts),
[rule checks](../../packages/server/src/item-rolls.test.ts),
[zone/difficulty rarity checks](../../packages/server/src/loot-rarity-modifiers.test.ts),
[persistence checks](../../packages/server/src/item-roll-persistence.test.ts),
[combat and reward checks](../../packages/server/src/item-roll-talents-rewards.test.ts) and
[desktop verification](../../tests/item-rarities.spec.ts).

## Inventory drag-and-drop verification

Inventory drag-and-drop verification: [native browser transfers](../../tests/inventory-drag.spec.ts),
[storage rules](../../packages/server/src/storehouse.test.ts),
[save failure paths](../../packages/server/src/storehouse-transactions.test.ts),
[migrations](../../packages/server/src/storehouse-migrations.test.ts), and
[shared UI drag/keyboard checks](../../packages/ui/tests/ui.spec.ts).

## Steam account ownership

New-runtime Steam accounts and nickname onboarding/editing are specified in
[CHAR-05](../specs/characters/identity.md#char-05--steam-accounts-and-nickname), with
[design and verification](../design/steam-accounts.md). Evidence: [server tests](../../packages/server/src/account-http-admission.test.ts) and [browser tests](../../tests/accounts.spec.ts).

## New-runtime Innkeeper

New-runtime Innkeeper: [SCENE-01](../specs/scenes/village.md#scene-01--village-and-interactions),
[runtime design](../design/new-runtime.md), [shared village definition](../../packages/core/src/definitions/worlds/village.ts)
and [browser verification](../../tests/innkeeper.spec.ts).

## Steam login and account nicknames (new runtime)

Steam login and account nicknames (new runtime):
[CHAR-05](../specs/characters/identity.md#char-05--steam-accounts-and-nickname),
[Account settings](../specs/interface/settings.md#ui-04--settings-and-music), and
[integration design and verification](../design/steam-accounts.md).

## New-runtime saved coins

New-runtime saved coins: [save lifecycle](../specs/characters/identity.md#char-03--save-lifecycle)
and [HUD](../specs/interface/hud.md#ui-01--hud-and-windows), implemented by
[pickup rules](../../packages/core/src/simulation.ts),
[character saves](../../packages/server/src/characters.ts), and
[PartyCard](../../packages/ui/src/components/PartyCard.tsx). Verification:
[pickup tests](../../packages/server/src/snapshots.test.ts),
[restart tests](../../packages/server/src/characters.test.ts), and
[browser scenario](../../tests/coins.spec.ts).

## Marta's empty bottles and 30-minute stock refresh

Marta's empty bottles and 30-minute stock refresh: [CHAR-04](../specs/characters/equipment.md#char-04--equipment-new-runtime),
[merchant rules and persistence tests](../../packages/server/src/merchant.test.ts),
and [trading browser tests](../../tests/inventory.spec.ts).

## New-runtime inventory, loot and trading

New-runtime inventory, loot and trading: [CHAR-04](../specs/characters/equipment.md#char-04--equipment-new-runtime)
and [UI-06](../specs/interface/inventory.md#ui-06--inventory-and-trading-new-runtime),
implemented by [equipment rules](../../packages/core/src/equipment.ts),
[slot presentation](../../packages/client/src/equipment-view.tsx) and the shared
[EquipmentPanel](../../packages/ui/src/components/EquipmentPanel.tsx). Verification:
[rule/save/protocol tests](../../packages/server/src/equipment.test.ts) and
[browser scenarios](../../tests/equipment.spec.ts) and
[class restriction tooltips](../../tests/inventory.spec.ts).
