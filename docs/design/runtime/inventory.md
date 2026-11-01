# Inventory, loot and trading

[Back to Game runtime](../new-runtime.md).

## Inventory, loot and shared trading

Anvil improvements use optional integer `stars` (0–5) on the existing item
instance contract; absent fields retain zero-star behavior. Core's
`createImprovementRules` resolves only the authenticated player's equipped and
backpack gear. Starter equipment without an instance receives a fresh identity
on its first improvement. The command includes item identity, optional equipped
slot and expected current stars, preventing stale or duplicate requests from
charging again. The server checks living village proximity to the anvil and uses
the existing detached-copy, save-before-publication character transaction.
Shared stat calculation applies the additive star multiplier to intrinsic and
rolled contributions without rewriting their original values. Client previews,
tooltips and comparisons use that same multiplier. Prices remain unchanged.

`core/content/rules.ts` owns validated 20-slot backpack entries, stack merging,
gear exchange, consumable use, quantity-aware trades and atomic whole-backpack sales.
Merchant buyback is a separate newest-first queue capped at 20 entries, including
whole consumable stacks from Sell all and modifier sales. Trade commands accept
an optional `amount` of `1`, `10` or `'stack'`, defaulting to one for older callers.
Core resolves the amount against the current source stack and validates the total
price and destination before mutating either owner. The client maps Ctrl to
`'stack'`, Shift to `10`, and unmodified actions to `1` for RMB, Enter/Space and
vendor drops. Storehouse and item-use actions keep their existing behavior.

Concept diagram of the implemented controls (not a gameplay capture):

![Trade quantity controls](../../images/trade-quantity.svg)
Legacy merchant gear stock migrates to buyback; potion stock stays in Buy.
Stable entry IDs make stale
commands harmless. Gear definitions remain the source of intrinsic stats and base prices; core's bound `itemPrice` combines the base price, rarity multiplier and normalized rolled stat score for both UI and transactions.
Per-class progress includes the backpack; older saves default to an empty array.
Forest kill drops join the existing wrapped pickup system; training exits before
rewards. The saved client `autoLoot` preference travels in validated combat input; the server excludes players with it disabled from item attraction and collection, without changing XP/gold eligibility. Missing fields retain automatic pickup for older clients. The client renders confirmed inventory and never grants items or coins.

`runtime.ts` derives item ownership from the authenticated session. Trading also
checks village proximity to Marta or Bram and validates the command's `npcId` against that NPC's live wrapped range, even when merchant ranges overlap. Older commands without `npcId` retain nearby-trader selection. The existing merchant record contains Bram's inventory, gold and buyback under `craftsman`, committed atomically with Marta's state. Decoding older records moves regular gear to Bram without rerolling and preserves Marta's buybacks and gold. Item commands mutate a detached copy, save first, then
publish live state. `characters.ts` stores shared merchant state by world ID and
commits it with the character save in one SQLite transaction. Single-process
synchronous commands serialize competing buyers; the first successful transfer
removes the entry before another can buy it. World deletion deletes merchant state.
The existing protocol payload carries backpacks and merchant state without a
second transport. UI components remain controlled; host callbacks send commands.

Merchant state includes a persisted `refreshAt` deadline. The server checks it
against wall time every tick, replaces regular stock and gold from `freshMerchant`,
and retains both merchants' buybacks. It saves before publishing stock or the system chat notice;
failed writes retain the old state and retry at the autosave cadence. Legacy merchants without a deadline
refresh once on load. Empty bottles use the existing resource stacking rules.

Verification: `packages/server/src/inventory*.test.ts` and
`tests/inventory.spec.ts` cover transfers, failures, migration, restart,
stacking, loot, unarmed casting and the replicated UI. `tests/auto-loot.spec.ts` covers the live setting, item pickup and reload persistence.
