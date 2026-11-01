# Emberfall documentation

Choose the task below, then load only the relevant topic. The [root README](../README.md) describes the game for players.

## Start here by task

| Task                                              | Start with                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Understand player-visible rules                   | [Specifications](specs/README.md)                                                             |
| Compare difficulty, dimension and party modifiers | [Difficulty reference](reference/difficulty.md)                                               |
| Locate feature code and test coverage             | [Feature map](features.md)                                                                    |
| Understand package ownership and data flow        | [Architecture](design/architecture.md)                                                        |
| Find an implementation design                     | [Design index](design/README.md)                                                              |
| Install, run or host the game                     | [Operations](operations.md)                                                                   |
| Write code or select checks                       | [Development](development.md)                                                                 |
| Find delivered work or unresolved decisions       | [Plans and historical evidence](plans/README.md)                                              |
| Trace artwork or licenses                         | [Assets and attribution](assets.md)                                                           |
| Work as a coding agent                            | [Root instructions](../AGENTS.md), then the affected subtree's AGENTS.md                      |
| Edit documentation                                | [Documentation instructions](AGENTS.md) and [maintenance guide](development/documentation.md) |

## How to use these documents

- **Specs** own observable behavior and stable requirement IDs.
- **Designs** own implementation boundaries, state, interfaces and failure handling.
- **Plans** own delivery sequence, unresolved decisions and dated verification records.
- **Package guides** own local authoring and reuse patterns.
- **Operations and development** own setup, maintenance and verification procedures.

Update the owning page when behavior changes. If source and specification disagree, establish the intended behavior before changing gameplay. A linked test identifies coverage; only an execution record proves it ran. Historical measurements describe their recorded revision and hardware.

## Bundled game mods

Start at [core authoring](../packages/core/README.md). Follow [mod requirements](specs/mods.md), [registry design](design/mods.md) or [delivery evidence](plans/mods.md) for the specific task.

## Hosting

[Hosting guidance](operations.md) covers local HTTPS, Steam configuration, a separate backend for GitHub Pages, deployment and save backups.

## Feature map

The [feature map](features.md) routes to source and test links by feature family. Keep new entries there rather than growing this index.
