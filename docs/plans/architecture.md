# Architecture refactoring sequence

Status: in progress. Each numbered batch is a separate reviewed PR, verified
before merging. The accepted scope is the architecture review of 2026-10-30.
Refactors preserve gameplay, saved and wire IDs, authoritative server ownership,
wrapped geometry, forest/training parity and existing public exports.

## Delivery sequence

| Batch | Scope                                                                            | Status      |
| ----- | -------------------------------------------------------------------------------- | ----------- |
| 1     | Remove world/scene geometry cycle and enforce package dependency direction       | In progress |
| 2     | PR verification workflow including core suites and desktop browser checks        | Pending     |
| 3     | Common contract modules and independent engine content contracts                 | Pending     |
| 4     | Save codec and migrations separated from repository transactions                 | Pending     |
| 5     | Server command groups, durable actions, sessions and runtime scheduling          | Pending     |
| 6     | Combat damage, rewards, ailments and projectiles; remove talent dependency cycle | Pending     |
| 7     | Talent definitions, mechanic dispatch, schedules and passive effects             | Pending     |
| 8     | Simulation systems, explicit tick order and deterministic random seams           | Pending     |
| 9     | Catalog-bound equipment, inventory, merchant and validation modules              | Pending     |
| 10    | Client session/recovery hook, world browser, HUD and panel descriptors           | Pending     |
| 11    | Arena input/frame/camera ownership and prediction separation                     | Pending     |
| 12    | Renderer drawing contract, pools, textures, paths and text                       | Pending     |
| 13    | Forest/village layers, effects, equipment views and artwork descriptors          | Pending     |
| 14    | NPC routines/dialogue scheduling and account HTTP/cookie helpers                 | Pending     |
| 15    | Settings/tactics descriptors, Codex chapters, village data and styles            | Pending     |
| 16    | Large test/fixture/story groups and art packaging responsibilities               | Pending     |
| 17    | Production-path replication and multi-world load measurements                    | Pending     |

## Verification and completion

Use 250 lines as a review trigger. Split along responsibilities rather than
passing a parent's entire mutable state into extracted files. Keep declarative
content serializable, with typed mechanic implementations outside definitions.
Preserve calibration values and random-call order during mechanical moves.

Each batch records its PR and actual checks here. Run checks from
[development](../development.md), including affected failure paths and desktop
browser cases. Do not claim performance gains from file movement. Replication
sharing requires measured benefit and viewer privacy tests; multi-process
deployment requires world, admission, reconnect and persistence ownership design.

The first batch makes world geometry depend directly on common, while scene
composition continues to consume world data. The package-boundary test rejects
forbidden workspace dependencies in manifests and source imports.
