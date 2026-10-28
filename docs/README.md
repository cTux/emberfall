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

Font selection and zoom rendering are covered by [graphics requirements](specs/graphics.md#graphics-01--presets-and-renderer),
the [shared UI guide](../packages/ui/README.md), [font browser checks](../tests/fonts.spec.ts)
and [preference validation](../tests/preferences.test.ts).

## Bundled game mods

[Mod requirements](specs/mods.md), [registry design](design/mods.md) and
[delivery/verification](plans/mods.md) describe core-owned content composition.
Start at the [core authoring guide](../packages/core/README.md),
[base mod](../packages/core/src/mods/base.mod.ts),
[composition](../packages/core/src/content/create-game.ts) and
[content-aware rules](../packages/core/src/content/rules.ts).
[Character saves](../packages/server/src/characters.ts) use the same catalog.
The plan maps extension, equipment, combat, protocol and persistence coverage.

## Hosting

[GitHub Pages setup](operations.md#github-pages-client-with-a-server-on-your-machine)
covers the static client and a separately hosted backend. Implementation:
[workflow](../.github/workflows/deploy-pages.yml),
[client URLs](../packages/client/src/urls.ts),
[account origin policy](../packages/server/src/accounts.ts).
Verification: [account integration tests](../packages/server/src/accounts.test.ts).

## Feature map

Lobby portal navigation: [SCENE-03](specs/scenes-and-village.md#scene-03--voting-and-entry),
[shared navigation renderer](../packages/client/src/navigation.ts) and
[off-screen and wrapped direction checks](../tests/navigation.test.ts).

Interactive cats: [SCENE-06](specs/scenes-and-village.md#scene-06--village-life),
[speech timing](../packages/client/src/cat-speech.ts),
[client interaction](../packages/client/src/Arena.tsx) and
[browser verification](../tests/cats.spec.ts).

Game cursors: [UI-02](specs/interface-and-audio.md#ui-02--combat-controls),
[host cursor states](../packages/client/src/cursors.ts),
[saved enable/size preferences](../packages/client/src/preferences.ts),
[cursor art](../packages/client/public/assets/cursors/README.md) and
[browser verification](../tests/cursors.spec.ts) and
[state rule checks](../tests/cursors.test.ts).

DPS meter visibility: [UI-03](specs/interface-and-audio.md#ui-03--network-and-performance-feedback),
[saved preference](../packages/client/src/preferences.ts), [HUD](../packages/client/src/Arena.tsx)
and [toggle/persistence verification](../tests/dps-meter.spec.ts).

Softer entity tones and optional texture filtering:
[GRAPHICS-01](specs/graphics.md#graphics-01--presets-and-renderer),
[atlas tone transform](../packages/client/src/art-tones.ts),
[renderer/settings verification](../tests/texture-filtering.spec.ts) and
[tone checks](../tests/art-tones.test.ts).

Floating battle text: [GRAPHICS-04](specs/graphics.md#graphics-04--combat-readability),
[shared renderer](../packages/client/src/damage-text.ts),
[animation and grouping tests](../packages/server/src/damage-text.test.ts) and
[Pixi pixel checks](../tests/renderer-pixels.spec.ts).

Inventory drag-and-drop verification: [native browser transfers](../tests/inventory-drag.spec.ts),
[storage rules and failure paths](../packages/server/src/storehouse.test.ts), and
[shared UI drag/keyboard checks](../packages/ui/tests/ui.spec.ts).

Bottom-center action bar: [UI-01](specs/interface-and-audio.md#ui-01--hud-and-windows),
[presentation design](design/presentation.md), [controlled component](../packages/ui/src/components/ActionBar.tsx)
and [replicated cooldown/gear coverage](../tests/action-bar.spec.ts).

Nearby interaction prompt: [UI-02](specs/interface-and-audio.md#ui-02--combat-controls),
[presentation design](design/presentation.md), [drawing helper](../packages/client/src/effects.ts),
[Arena integration](../packages/client/src/Arena.tsx), and
[village/forest browser coverage](../tests/interaction-outlines.spec.ts).
The default-on combat gathering hint toggle is covered by
[gathering scenarios](../tests/gathering.spec.ts) and
[preference validation](../tests/preferences.test.ts).

| Feature group                                    | Specification                                                   | Design                                                           | Verification entry points                                                                                                                                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worlds, recovery and chat                        | [WORLD/CHAT](specs/worlds-and-chat.md)                          | [Network](design/network-and-persistence.md)                     | `worlds.test.ts`, `reconnect.test.ts`, `chat.test.ts`, `gameplay.spec.ts`, `reconnect.spec.ts`, `chat-presentation.spec.ts`, `npc-chat.test.ts`, `npc-models.test.ts`, `npcs.spec.ts`                                                                   |
| Steam accounts, characters and classes           | [CHAR](specs/characters.md)                                     | [Accounts](design/steam-accounts.md)                             | `accounts.test.ts`, `characters.test.ts`, `classes.test.ts`, `accounts.spec.ts`                                                                                                                                                                         |
| Village, forest and training                     | [SCENE](specs/scenes-and-village.md), [COMBAT](specs/combat.md) | [Simulation](design/simulation.md)                               | `scenes.test.ts`, `village.test.ts`, `village-scenery.test.ts`, `village-scenery.spec.ts`, `npcs.test.ts`, `npcs.spec.ts`, `training.test.ts`, `enemies.test.ts`, `gameplay.spec.ts`                                                                    |
| Prediction and replication                       | [SCENE/UI](specs/interface-and-audio.md)                        | [Movement](design/movement.md), [runtime](design/new-runtime.md) | `local-movement.test.ts`, `local-projectiles.test.ts`, `snapshots.test.ts`, `protocol.test.ts`                                                                                                                                                          |
| Inventory, equipment, storage and trading        | [CHAR](specs/characters.md)                                     | [Runtime](design/new-runtime.md)                                 | `inventory.test.ts`, [storage rules](../packages/server/src/storehouse.test.ts), [storage UI](../tests/storehouse.spec.ts), `equipment.test.ts`, `inventory.spec.ts`, `equipment.spec.ts`, `innkeeper.spec.ts`, [auto-loot](../tests/auto-loot.spec.ts) |
| HUD, controls, settings and audio                | [UI](specs/interface-and-audio.md)                              | [Presentation](design/presentation.md)                           | `gameplay.spec.ts`, `companion-hud.spec.ts`, `packages/ui/tests/ui.spec.ts`                                                                                                                                                                             |
| Rendering, shadows and assets                    | [GRAPHICS](specs/graphics.md), [assets](assets.md)              | [Runtime](design/new-runtime.md)                                 | `rendering.spec.ts`, `renderer-pixels.spec.ts`, `entity-layering.spec.ts`, `terrain-loading.spec.ts`, `player-art.spec.ts`, `test:images`                                                                                                               |
| Performance                                      | [GRAPHICS](specs/graphics.md)                                   | [Development](development.md)                                    | Opt-in `frame-budget.spec.ts` and `pnpm benchmark`                                                                                                                                                                                                      |
| Progression, paragon, talents and bullseye reset | [PROG-01–03](specs/progression.md)                              | [Runtime](design/new-runtime.md#simulation-and-replication)      | `packages/server/src/progression.test.ts`, `packages/server/src/talents.test.ts`, `tests/progression.spec.ts`, `tests/talents.spec.ts`                                                                                                                  |

New-runtime Steam accounts and nickname onboarding/editing are specified in
[CHAR-05](specs/characters.md#char-05--steam-accounts-and-nickname), with
[design and verification](design/steam-accounts.md). Evidence: [server tests](../packages/server/src/accounts.test.ts) and [browser tests](../tests/accounts.spec.ts).

Server tests live in [packages/server/src](../packages/server/src), game browser tests in [tests](../tests), and shared UI tests in [packages/ui/tests](../packages/ui/tests). See [development](development.md) for commands and evidence expectations.

## Start here by task

Resident workstations: [SCENE-06](specs/scenes-and-village.md#scene-06--village-life),
[registered work spots](../packages/core/src/mods/base/worlds/village.ts),
[authoritative routines](../packages/server/src/npcs.ts),
[work poses and effects](../packages/client/src/npc-art.ts),
[server verification](../packages/server/src/npcs.test.ts) and
[browser verification](../tests/npcs.spec.ts).

New-runtime Innkeeper: [SCENE-01](specs/scenes-and-village.md#scene-01--village-and-interactions),
[runtime design](design/new-runtime.md), [shared village definition](../packages/core/src/definitions/worlds/village.ts)
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
[pickup rules](../packages/core/src/simulation.ts),
[character saves](../packages/server/src/characters.ts), and
[PartyCard](../packages/ui/src/components/PartyCard.tsx). Verification:
[pickup tests](../packages/server/src/snapshots.test.ts),
[restart tests](../packages/server/src/characters.test.ts), and
[browser scenario](../tests/coins.spec.ts).

New-runtime inventory, loot and trading: [CHAR-04](specs/characters.md#char-04--equipment-new-runtime)
and [UI-06](specs/interface-and-audio.md#ui-06--inventory-and-trading-new-runtime),
implemented by [equipment rules](../packages/core/src/equipment.ts),
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

Talents: [rules](specs/progression.md#prog-03--talents),
[design](design/new-runtime.md#talent-configuration),
[authoritative tests](../packages/server/src/talents.test.ts) and
[browser scenario](../tests/talents.spec.ts).

Resource gathering: [VILLAGE-07](specs/scenes-and-village.md#village-07--gathering),
implemented by [shared rules](../packages/core/src/gathering.ts) and verified by
[gathering tests](../packages/server/src/gathering.test.ts) and
[browser gathering checks](../tests/gathering.spec.ts).
