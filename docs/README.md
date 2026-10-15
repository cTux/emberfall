# Emberfall documentation

This is the maintained map of existing features and their implementation. The baseline was reconciled against source revision `ee008ec` on 2026-10-03. Later changes should update the affected pages in the same PR as the code.

## How to use these documents

The sole runtime uses PixiJS, Miniplex and Colyseus; see its [runtime design](design/new-runtime.md)
and [historical verification record](plans/new-runtime.md). Package guides explain development,
testing and reuse: [common](../packages/common/README.md),
[server](../packages/server/README.md), [client](../packages/client/README.md).

- **Specifications** describe observable rules, scope and acceptance scenarios. Requirement IDs identify stable behavior groups, not individual test cases.
- **Technical designs** describe ownership, state, interfaces, failure behavior and verification seams.
- **The implementation plan** records delivered capabilities, dependencies and remaining work. An existing feature is not presented as work still to build.
- **Operations/development** describe how to run, verify and maintain the repository.

An explicit product decision takes precedence over the baseline. If source and specification disagree, record the discrepancy and establish which behavior is intended before changing gameplay. Do not silently turn a documented defect or a proposed idea into a requirement. “Implemented” describes observed source behavior; linked tests are coverage references, not a claim that every scenario was executed in this documentation task.

## Feature map

| Feature group                           | Specification                                                   | Design                                                           | Verification entry points                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Worlds, recovery and chat               | [WORLD/CHAT](specs/worlds-and-chat.md)                          | [Network](design/network-and-persistence.md)                     | `worlds.test.ts`, `reconnect.test.ts`, `chat.test.ts`, `gameplay.spec.ts`, `reconnect.spec.ts`, `chat-presentation.spec.ts`               |
| Steam accounts, characters and classes  | [CHAR](specs/characters.md)                                     | [Accounts](design/steam-accounts.md)                             | `accounts.test.ts`, `characters.test.ts`, `classes.test.ts`, `accounts.spec.ts`                                                           |
| Village, forest and training            | [SCENE](specs/scenes-and-village.md), [COMBAT](specs/combat.md) | [Simulation](design/simulation.md)                               | `scenes.test.ts`, `village.test.ts`, `training.test.ts`, `enemies.test.ts`, `gameplay.spec.ts`                                            |
| Prediction and replication              | [SCENE/UI](specs/interface-and-audio.md)                        | [Movement](design/movement.md), [runtime](design/new-runtime.md) | `local-movement.test.ts`, `local-projectiles.test.ts`, `snapshots.test.ts`, `protocol.test.ts`                                            |
| Inventory, equipment and shared trading | [CHAR](specs/characters.md)                                     | [Runtime](design/new-runtime.md)                                 | `inventory.test.ts`, `equipment.test.ts`, `inventory.spec.ts`, `equipment.spec.ts`, `innkeeper.spec.ts`                                   |
| HUD, controls, settings and audio       | [UI](specs/interface-and-audio.md)                              | [Presentation](design/presentation.md)                           | `gameplay.spec.ts`, `companion-hud.spec.ts`, `packages/ui/tests/ui.spec.ts`                                                               |
| Rendering, shadows and assets           | [GRAPHICS](specs/graphics.md), [assets](assets.md)              | [Runtime](design/new-runtime.md)                                 | `rendering.spec.ts`, `renderer-pixels.spec.ts`, `entity-layering.spec.ts`, `terrain-loading.spec.ts`, `player-art.spec.ts`, `test:images` |
| Performance                             | [GRAPHICS](specs/graphics.md)                                   | [Development](development.md)                                    | Opt-in `frame-budget.spec.ts` and `pnpm benchmark`                                                                                        |
| Uninterrupted progression and paragon   | [PROG-01/02](specs/progression.md)                              | [Runtime](design/new-runtime.md#simulation-and-replication)      | `packages/server/src/progression.test.ts`, `tests/progression.spec.ts`                                                                    |

New-runtime Steam accounts and nickname onboarding/editing are specified in
[CHAR-05](specs/characters.md#char-05--steam-accounts-and-nickname), with
[design and verification](design/steam-accounts.md). Evidence: [server tests](../packages/server/src/accounts.test.ts) and [browser tests](../tests/accounts.spec.ts).

Server tests live in [packages/server/src](../packages/server/src), game browser tests in [tests](../tests), and shared UI tests in [packages/ui/tests](../packages/ui/tests). See [development](development.md) for commands and evidence expectations.

## Start here by task

New-runtime Innkeeper: [SCENE-01](specs/scenes-and-village.md#scene-01--village-and-interactions),
[runtime design](design/new-runtime.md), [shared village definition](../packages/common/src/definitions/worlds/village.ts)
and [browser verification](../tests/innkeeper.spec.ts).

New-client hitbox debugging: [UI-04](specs/interface-and-audio.md#ui-04--settings-and-music),
[overlay design](design/new-runtime.md), [renderer](../packages/client/src/hitboxes.ts)
and [browser verification](../tests/hitboxes.spec.ts).

Steam login and account nicknames (new runtime):
[CHAR-05](specs/characters.md#char-05--steam-accounts-and-nickname),
[Account settings](specs/interface-and-audio.md#ui-04--settings-and-music), and
[integration design and verification](design/steam-accounts.md).

New-client wardrobe-style art: [GRAPHICS-05](specs/graphics.md#graphics-05--wardrobe-style-art-in-the-new-client),
[atlas design](design/new-runtime.md#wardrobe-style-presentation-assets), and
[asset provenance and prompts](../packages/client/public/assets/wardrobe-style/README.md).
Verification: `tests/art-animation.test.ts`, `tests/art-assets.spec.ts`,
and the training/forest browser scenarios in `tests/gameplay.spec.ts`.

New-client frame-time regressions: [performance skill](../.agents/skills/emberfall-performance/SKILL.md)
and `tests/frame-budget.spec.ts`. Local projectile/pickup offsets:
[reconciliation skill](../.agents/skills/emberfall-reconciliation/SKILL.md),
[alignment design](design/new-runtime.md#local-effect-alignment),
`packages/server/src/local-projectiles.test.ts` and
`packages/server/src/pickup-presentation.test.ts`.

New-runtime saved coins: [save lifecycle](specs/characters.md#char-03--save-lifecycle)
and [HUD](specs/interface-and-audio.md#ui-01--hud-and-windows), implemented by
[pickup rules](../packages/common/src/simulation.ts),
[character saves](../packages/server/src/characters.ts), and
[PartyCard](../packages/ui/src/components/PartyCard.tsx). Verification:
[pickup tests](../packages/server/src/snapshots.test.ts),
[restart tests](../packages/server/src/characters.test.ts), and
[browser scenario](../tests/coins.spec.ts).

New-runtime inventory, loot and trading: [CHAR-04](specs/characters.md#char-04--equipment-new-runtime)
and [UI-06](specs/interface-and-audio.md#ui-06--inventory-and-trading-new-runtime),
implemented by [equipment rules](../packages/common/src/equipment.ts),
[slot presentation](../packages/client/src/equipment-view.tsx) and the shared
[EquipmentPanel](../packages/ui/src/components/EquipmentPanel.tsx). Verification:
[rule/save/protocol tests](../packages/server/src/equipment.test.ts) and
[browser scenarios](../tests/equipment.spec.ts).

- Run or host the game: [operations](operations.md).
- Understand package ownership: [architecture](design/architecture.md).
- Find delivered work or plan a change: [implementation plan](plans/implementation.md).
- Change documentation: [documentation instructions](AGENTS.md).
- Work as an agent: [root instructions](../AGENTS.md) and the applicable package instructions.

The root README is the short entry point. Keep behavior in its spec, mechanics in its design, commands in development/operations and reusable agent procedures in repo skills. Do not append a new chronological feature paragraph to the README.
