# Architecture refactoring sequence

Status: in progress. Each numbered batch is a separate reviewed PR, verified
before merging. The accepted scope is the architecture review of 2026-10-30.
Refactors preserve gameplay, saved and wire IDs, authoritative server ownership,
wrapped geometry, forest/training parity and existing public exports.

## Delivery sequence

| Batch | Scope                                                                            | Status                                                                                                                                                                                                                                                                  |
| ----- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Remove world/scene geometry cycle and enforce package dependency direction       | Merged [#309](https://github.com/cTux/emberfall/pull/309); 387 root and 22 core tests, typecheck, lint and build passed                                                                                                                                                 |
| 2     | PR verification workflow including core suites and desktop browser checks        | Merged [#310](https://github.com/cTux/emberfall/pull/310), [#351](https://github.com/cTux/emberfall/pull/351); affected PR browsers restored                                                                                                                            |
| 3     | Common contract modules and independent engine content contracts                 | Merged [#312](https://github.com/cTux/emberfall/pull/312)                                                                                                                                                                                                               |
| 4     | Save codec and migrations separated from repository transactions                 | Merged [#313](https://github.com/cTux/emberfall/pull/313), [#352](https://github.com/cTux/emberfall/pull/352)                                                                                                                                                           |
| 5     | Server command groups, durable actions, sessions and runtime scheduling          | Merged [#314](https://github.com/cTux/emberfall/pull/314), [#353](https://github.com/cTux/emberfall/pull/353)                                                                                                                                                           |
| 6     | Combat damage, rewards, ailments and projectiles; remove talent dependency cycle | Merged [#315](https://github.com/cTux/emberfall/pull/315)                                                                                                                                                                                                               |
| 7     | Talent definitions, mechanic dispatch, schedules and passive effects             | Merged [#316](https://github.com/cTux/emberfall/pull/316)                                                                                                                                                                                                               |
| 8     | Simulation systems, explicit tick order and deterministic random seams           | Merged [#317](https://github.com/cTux/emberfall/pull/317), [#354](https://github.com/cTux/emberfall/pull/354)                                                                                                                                                           |
| 9     | Catalog-bound equipment, inventory, merchant and validation modules              | Merged [#318](https://github.com/cTux/emberfall/pull/318), [#319](https://github.com/cTux/emberfall/pull/319)                                                                                                                                                           |
| 10    | Client session/recovery hook, world browser, HUD and panel descriptors           | Merged [#320](https://github.com/cTux/emberfall/pull/320)–[#323](https://github.com/cTux/emberfall/pull/323)                                                                                                                                                            |
| 11    | Arena input/frame/camera ownership and prediction separation                     | Merged [#324](https://github.com/cTux/emberfall/pull/324)–[#326](https://github.com/cTux/emberfall/pull/326), [#338](https://github.com/cTux/emberfall/pull/338), [#341](https://github.com/cTux/emberfall/pull/341)                                                    |
| 12    | Renderer drawing contract, pools, textures, paths and text                       | Merged [#327](https://github.com/cTux/emberfall/pull/327)–[#332](https://github.com/cTux/emberfall/pull/332)                                                                                                                                                            |
| 13    | Forest/village layers, effects, equipment views and artwork descriptors          | Merged [#333](https://github.com/cTux/emberfall/pull/333)–[#337](https://github.com/cTux/emberfall/pull/337), [#340](https://github.com/cTux/emberfall/pull/340), [#344](https://github.com/cTux/emberfall/pull/344)–[#346](https://github.com/cTux/emberfall/pull/346) |
| 14    | NPC routines/dialogue scheduling and account HTTP/cookie helpers                 | Merged [#348](https://github.com/cTux/emberfall/pull/348)–[#350](https://github.com/cTux/emberfall/pull/350)                                                                                                                                                            |
| 15    | Settings/tactics descriptors, Codex chapters, village data and styles            | Merged [#339](https://github.com/cTux/emberfall/pull/339), [#342](https://github.com/cTux/emberfall/pull/342), [#343](https://github.com/cTux/emberfall/pull/343), [#347](https://github.com/cTux/emberfall/pull/347)                                                   |
| 16    | Large test/fixture/story groups and art packaging responsibilities               | Merged [#355](https://github.com/cTux/emberfall/pull/355), [#356](https://github.com/cTux/emberfall/pull/356); browser/story split in [#357](https://github.com/cTux/emberfall/pull/357)                                                                                |
| 17    | Production-path replication and multi-world load measurements                    | Pending                                                                                                                                                                                                                                                                 |

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

## Current verification record

Each linked PR records its own immutable-head review and checks. The original
queued refactors are merged; subsequent work continues one PR at a time.
Affected PR browser checks are enabled. Final completion still requires the load
measurements and a manual full Verify run on the final `main` revision.

- The Node suite split retained all 253 declarations/groups and 38 shared fixture
  declarations. Its final local run passed 414 root tests and 24 core tests.
- The art packager split produced byte-identical PNG/JSON output for all four
  classes on disposable source copies; no shipped artwork changed.
- Browser entry paths, all 127 game and 45 UI case IDs/titles, and all built
  Storybook IDs remain intact. Nine desktop screen compositions have
  pixel-identical before/after captures. Verification also corrected a stale
  nearest-text assertion to the documented linear sampling and isolated pointer
  checks from NPC movement. Direct renderer border probes replace a portal's
  animated whole-frame pixel-area comparison.
- A source inventory of TypeScript, TSX, MJS and SCSS under `packages`, `scripts`
  and `tests`, excluding generated output and dependencies, leaves one reviewed
  250-line trigger: the 260-line [Pixi drawing façade](../../packages/client/src/rendering/pixi-context.ts).
  It implements the coherent drawing contract; state, resource pools, textures,
  text and lifecycle already have separate owners. Further forwarding wrappers
  would add interfaces without separating another responsibility.
