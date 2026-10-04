# Emberfall documentation

This is the maintained map of existing features and their implementation. The baseline was reconciled against source revision `ee008ec` on 2026-10-03. Later changes should update the affected pages in the same PR as the code.

## How to use these documents

The independent `*-new` implementation has its own [runtime design](design/new-runtime.md)
and [verification plan](plans/new-runtime.md). It shares these gameplay specifications
and the UI package with the original runtime. Package guides explain development,
testing and reuse: [common-new](../packages/common-new/README.md),
[server-new](../packages/server-new/README.md), [client-new](../packages/client-new/README.md).

- **Specifications** describe observable rules, scope and acceptance scenarios. Requirement IDs identify stable behavior groups, not individual test cases.
- **Technical designs** describe ownership, state, interfaces, failure behavior and verification seams.
- **The implementation plan** records delivered capabilities, dependencies and remaining work. An existing feature is not presented as work still to build.
- **Operations/development** describe how to run, verify and maintain the repository.

An explicit product decision takes precedence over the baseline. If source and specification disagree, record the discrepancy and establish which behavior is intended before changing gameplay. Do not silently turn a documented defect or a proposed idea into a requirement. “Implemented” describes observed source behavior; linked tests are coverage references, not a claim that every scenario was executed in this documentation task.

## Feature map

| Feature group                                                       | Specification                                                                                                                                     | Technical design                                                             | Verification entry points                                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| World browser, passwords, capacity, permanent world, host transfer  | [WORLD-01](specs/worlds-and-chat.md#world-01--discovery-and-membership)                                                                           | [Network](design/network-and-persistence.md)                                 | `worlds.test.ts`, `lobby.spec.ts`                                                                                                        |
| Disconnect/reload/restart recovery, client build updates            | [WORLD-01/02](specs/worlds-and-chat.md)                                                                                                           | [Network](design/network-and-persistence.md), [operations](operations.md)    | `reconnect.test.ts`, `update-recovery.test.ts`, `reconnect.spec.ts`                                                                      |
| World chat, speech bubbles and system messages                      | [CHAT-01–03](specs/worlds-and-chat.md)                                                                                                            | [Network](design/network-and-persistence.md)                                 | `chat.test.ts`, `chat.spec.ts`                                                                                                           |
| Browser character identity, class saves and wardrobe                | [CHAR-01–03](specs/characters.md)                                                                                                                 | [Persistence](design/network-and-persistence.md)                             | `characters.test.ts`, `classes.test.ts`, `classes.spec.ts`                                                                               |
| Village, buildings, paths, wrapped camera and interactions          | [SCENE-01/02](specs/scenes-and-village.md)                                                                                                        | [Simulation](design/simulation.md), [presentation](design/presentation.md)   | `village.test.ts`, `pass-through.test.ts`, `buildings.spec.ts`, `paths.spec.ts`, `lobby-camera.spec.ts`                                  |
| Readiness, countdown, late join, pause/regenerate, boss and returns | [SCENE-03–05](specs/scenes-and-village.md)                                                                                                        | [Simulation](design/simulation.md)                                           | `scenes.test.ts`, `scenes.spec.ts`, `portal.spec.ts`, `boss-health.spec.ts`                                                              |
| Four classes, melee/projectiles, ailments and Bear                  | [COMBAT-01–03](specs/combat.md)                                                                                                                   | [Simulation](design/simulation.md)                                           | `classes.test.ts`, `enemies.test.ts`, `combat-features.spec.ts`                                                                          |
| Enemy archetypes, telegraphs, scaling and boss                      | [COMBAT-02](specs/combat.md#combat-02--encounters-and-scaling)                                                                                    | [Simulation](design/simulation.md)                                           | `enemies.test.ts`, `enemies.spec.ts`                                                                                                     |
| Training, DPS, XP and cosmetic gold pickups                         | [COMBAT-04/05](specs/combat.md)                                                                                                                   | [Simulation](design/simulation.md)                                           | `training.test.ts`, `training.spec.ts`, `combat-features.spec.ts`                                                                        |
| Movement prediction, interpolation and cast reconciliation          | [SCENE-02](specs/scenes-and-village.md#scene-02--world-geometry), [UI-02](specs/interface-and-audio.md#ui-02--combat-controls)                    | [Movement](design/movement.md)                                               | `local-movement.test.ts`, `local-projectiles.test.ts`, `snapshots.test.ts`, `predictive-casting.spec.ts`, `snapshots.spec.ts`            |
| HUD, Codex, settings, windows, keyboard, numbers and navigation     | [UI-01–05](specs/interface-and-audio.md)                                                                                                          | [Presentation](design/presentation.md), [UI guide](../packages/ui/README.md) | `hud.spec.ts`, `keyboard-layout.spec.ts`, `number-display.spec.ts`, `context-menu.spec.ts`, UI suite                                     |
| Music, sound, gestures, playlists and visibility                    | [UI-04](specs/interface-and-audio.md#ui-04--settings-and-music)                                                                                   | [Presentation](design/presentation.md)                                       | `rendering.spec.ts`                                                                                                                      |
| Performance graphs, stale state, adaptive scale and frame caps      | [UI-03](specs/interface-and-audio.md#ui-03--network-and-performance-feedback), [GRAPHICS-01](specs/graphics.md#graphics-01--presets-and-renderer) | [Movement](design/movement.md), [presentation](design/presentation.md)       | `latency.spec.ts`, `startup-performance.spec.ts`, snapshot benchmark                                                                     |
| Presets, lighting, shadows, fog, foliage, critters and occlusion    | [GRAPHICS-01–03](specs/graphics.md)                                                                                                               | [Presentation](design/presentation.md)                                       | `graphics.spec.ts`, `tree-opacity.spec.ts`, `critters.test.ts`, `critter-shadow.spec.ts`, `animal-shadows.spec.ts`, `torch-fire.spec.ts` |
| Weapons, debuff icons, flashes, death effects and portals           | [GRAPHICS-04](specs/graphics.md#graphics-04--combat-readability)                                                                                  | [Presentation](design/presentation.md)                                       | `weapon-visibility.spec.ts`, `damage-flash.spec.ts`, `rendering.spec.ts`                                                                 |
| Shared UI components and Storybook                                  | [UI specification](specs/interface-and-audio.md), [component guide](../packages/ui/README.md)                                                     | [Presentation](design/presentation.md)                                       | `packages/ui/tests/ui.spec.ts`                                                                                                           |
| Asset provenance, credits and fonts                                 | [Assets](assets.md)                                                                                                                               | [Presentation](design/presentation.md)                                       | `fonts.spec.ts`, shipped license/credit files                                                                                            |
| Progression without required choices                                | [PROG-01](specs/progression.md)                                                                                                                   | [Architecture boundary](design/architecture.md#change-boundaries)            | Future acceptance only; no new progression implementation                                                                                |

Server tests live in [packages/server/src](../packages/server/src), game browser tests in [tests](../tests), and shared UI tests in [packages/ui/tests](../packages/ui/tests). See [development](development.md) for commands and evidence expectations.

## Start here by task

New-client wardrobe-style art: [GRAPHICS-05](specs/graphics.md#graphics-05--wardrobe-style-art-in-the-new-client),
[atlas design](design/new-runtime.md#wardrobe-style-presentation-assets), and
[asset provenance and prompts](../packages/client-new/public/assets/wardrobe-style/README.md).
Verification: `tests-new/art-animation.test.ts`, `tests-new/art-assets.spec.ts`,
and the training/forest browser scenarios in `tests-new/gameplay.spec.ts`.

New-client frame-time regressions: [performance skill](../.agents/skills/emberfall-performance/SKILL.md)
and `tests-new/frame-budget.spec.ts`. Local projectile/pickup offsets:
[reconciliation skill](../.agents/skills/emberfall-reconciliation/SKILL.md),
[alignment design](design/new-runtime.md#local-effect-alignment),
`packages/server-new/src/local-projectiles.test.ts` and
`packages/server-new/src/pickup-presentation.test.ts`.

New-runtime equipment: [CHAR-04](specs/characters.md#char-04--equipment-new-runtime)
and [UI-06](specs/interface-and-audio.md#ui-06--equipment-inspection-new-runtime),
implemented by [equipment rules](../packages/common-new/src/equipment.ts),
[slot presentation](../packages/client-new/src/equipment-view.tsx) and the shared
[EquipmentPanel](../packages/ui/src/components/EquipmentPanel.tsx). Verification:
[rule/save/protocol tests](../packages/server-new/src/equipment.test.ts) and
[browser scenarios](../tests-new/equipment.spec.ts).

- Run or host the game: [operations](operations.md).
- Understand package ownership: [architecture](design/architecture.md).
- Find delivered work or plan a change: [implementation plan](plans/implementation.md).
- Change documentation: [documentation instructions](AGENTS.md).
- Work as an agent: [root instructions](../AGENTS.md) and the applicable package instructions.

The root README is the short entry point. Keep behavior in its spec, mechanics in its design, commands in development/operations and reusable agent procedures in repo skills. Do not append a new chronological feature paragraph to the README.
