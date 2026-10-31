# Bundled mod delivery and verification

Status: implemented; verification results and browser limitations are recorded
below. Requirements are [MOD-01–04](../specs/mods.md); the
[design](../design/mods.md) owns architecture decisions.

## Delivery order

| Stage                   | Delivered result                                                                                                                                                                         | Status                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 0. Documentation first  | Specification, design, plan and package guidance merged before runtime work.                                                                                                             | PR #169, merge `f674cf2`                |
| 1. Registry foundation  | Typed registration/read APIs, deterministic loading, duplicate/reference/value checks, immutable data and isolated `createGame` contexts.                                                | Implemented                             |
| 2. Base catalog         | `core/src/mods/base.mod.ts` registers the shipped definitions/configs. Public views derive from the ready catalog.                                                                       | Implemented                             |
| 3. Dependency migration | Common retains contracts, structural schemas and pure geometry. Core owns content-aware rules, schemas and bound world helpers; all consumers move to core imports.                      | Implemented                             |
| 4. Playable runtime     | Startup, class/ability/enemy dispatch, equipment/loot, class saves and prediction consume registered content. Selected kernels and `createCharacterPersistence` accept fixture contexts. | Implemented                             |
| 5. Presentation         | Registered class/slot/stat views and supported class/enemy art families reach the client without adding game dependencies to UI.                                                         | Implemented; fixture checks passed      |
| 6. Verification         | Focused fixture extension tests, base regression suites, build and browser checks; reconcile docs with executed evidence.                                                                | Checks passed; browser limitation below |

## Delivered boundaries

Core composes portable game rules; server retains scheduling, authoritative ECS,
transport and persistence. Client retains input, prediction and rendering. Common
never imports core, and old definition subpaths have been removed. The default
game initializes once; isolated test contexts do not switch global state.

Additive items, slots, stats, classes, abilities and enemies use the public
registration API. Abilities and artwork reuse supported families. Additional
stats aggregate/display without a new combat effect. Added enemies need an
explicit `spawnRules` entry; cumulative chances cannot exceed 1. Ailment identities, one Bear companion, current
scene/encounter families, pickup/effect/critter and enemy type/difficulty
identities, and reserved action
slots remain fixed. Content overrides, removal migrations, dynamic downloads,
hot reload and per-session mod sets are outside this change.

## Verification

Documentation PR #169 passed formatting, whitespace and 290 relative
file/anchor checks across 15 Markdown files. Runtime verification is separate;
the table below maps required coverage, not completed runs.

Runtime stage uses the existing high-level seams wherever possible:

| Concern                          | Required evidence and existing seam                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry lifecycle               | [Registry lifecycle](../../packages/core/src/content/tests/registries.test.ts) and [rejection tests](../../packages/core/src/content/tests/registry-validation.test.ts) use the [fixture mod](../../packages/core/src/content/tests/fixture.ts); duplicate mod/definition IDs, invalid values/references, unsupported mechanics, no start on failure, immutable ready content and independent instances. Add focused core tests and include them in the executed package test command.        |
| Base content and balance         | Validate content during [composition](../../packages/core/src/content/create-game.ts) before [runtime startup](../../packages/server/src/runtime.ts), and preserve [balance tests](../../packages/core/src/utils/tests/balance.test.ts); compare relevant IDs, values and ordering, not only registry size.                                                                                                                                                                                   |
| Real content extension           | [Integration tests](../../packages/server/src/mods.test.ts) use the fixture mod: added item/category/slot/stat reach equip, storage, trade, totals and views; added class saves independently and uses shared forest/training dispatch; abilities affect duration/projectiles/prediction; enemy definitions affect spawns, hitboxes, movement and incoming damage. Use public composition, not direct mutation of internal maps.                                                              |
| Equipment/inventory transactions | [Equipment](../../packages/server/src/equipment.test.ts), [inventory](../../packages/server/src/inventory.test.ts), [Storehouse](../../packages/server/src/storehouse.test.ts), [inventory transactions](../../packages/server/src/inventory-transactions.test.ts), [Storehouse transactions](../../packages/server/src/storehouse-transactions.test.ts); test unsupported IDs, full inventory, unarmed state and failed saves.                                                               |
| Saves and wire compatibility     | [Characters](../../packages/server/src/characters.test.ts), [protocol](../../packages/server/src/protocol.test.ts), [reconnect](../../packages/server/src/reconnect.test.ts); round-trip base and fixture IDs, old saves and isolated class records.                                                                                                                                                                                                                                          |
| Combat and geometry              | [Class attacks](../../packages/server/src/class-ranged-attacks.test.ts), [roots](../../packages/server/src/class-roots.test.ts), [enemies](../../packages/server/src/enemies.test.ts), [training](../../packages/server/src/training.test.ts), [scenes](../../packages/server/src/scenes.test.ts), [local projectiles](../../packages/server/src/local-projectiles.test.ts) and [local movement](../../packages/server/src/local-movement.test.ts); forest/training parity and wrapped edges. |
| Browser smoke                    | [Gameplay](../../tests/gameplay.spec.ts), [equipment](../../tests/equipment.spec.ts), [action bar](../../tests/action-bar.spec.ts), [progression](../../tests/progression.spec.ts) and relevant inventory/Storehouse interactions after building. Check class selection, training, forest, prediction, item views and reconnects.                                                                                                                                                             |
| Dependency/build boundary        | `pnpm fmt:check`, `pnpm lint`, `pnpm typecheck`, core package typecheck/tests, `pnpm test` and `pnpm build`. Search for prohibited common-to-core edges and old content consumers; inspect generated browser/server startup.                                                                                                                                                                                                                                                                  |

Add focused cases to existing suites where possible. New tests must prove runtime
behavior and validation failures rather than mirror private registry internals.
Use disposable SQLite databases. Report actual commands, passes/failures and any
unexecuted browser scenarios. The executed checks below are distinct from these coverage requirements.

## Executed checks

The baseline passed all 199 Node tests before runtime work. The final full
`pnpm test` run passed all 203 tests in 96.3 seconds. Core's test command passed
all five files, including registry validation and extension cases. Root/core/UI
typechecks, lint and formatting passed. The final production build passed all
three packages (client, server and UI Storybook) in 33.1 seconds. A focused
registry rerun also passed after requiring safe nonnegative integer item prices,
matching the gold contract.

The added integration cases cover category/item/slot/stat equip, storage transfer,
merchant trade, SQLite restart, client views and protocol projection; class and
ability behavior reaches shared forest/training dispatch, duration, shots and
prediction. Enemy content reaches explicit spawn rules, attributes, hitboxes,
movement and incoming damage. An existing scene geometry test now fixes its
random roll so critical hits cannot invalidate its base-damage assertion.

Browser verification used system Chromium 154. The feature branch's action-bar
scenario passed with Low graphics. Gameplay, equipment, inventory and progression
attempts timed out waiting for interactions; Storehouse was interrupted without
a clean result. Earlier runs reported 6–9 second input acknowledgement delays and
roughly 6 FPS on the host. A fresh detached worktree at `f674cf2` (the merged
documentation PR with unchanged runtime), frozen install and original client build
reproduced the same gameplay wardrobe timeout at the test's explicit 6000 ms
interaction wait using Chromium 154, Low graphics and the same temporary
15-second expectation configuration. This establishes that the observed timeout
also affects the baseline; it does not establish that all browser behavior passes
on the feature branch. The selected browser suite remains incompletely verified.
Temporary browser configurations and artifacts are not committed.

Documentation formatting and whitespace checks passed across 27 changed
Markdown files, and all 355 relative file/anchor links resolved. The core README
extension example executed against `createGame`; its additional stat produced
the expected total and its explicit spawn rule validated.
