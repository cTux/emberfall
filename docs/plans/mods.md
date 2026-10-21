# Bundled mod implementation plan

Status: accepted, not yet implemented. Requirements are [MOD-01–04](../specs/mods.md);
the [design](../design/mods.md) owns architecture decisions. Every stage preserves
current gameplay and the common/core dependency direction.

## Delivery order

| Stage                               | Work and exit condition                                                                                                                                                                                                                     | Status                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 0. Documentation first              | Merge the specification, design, plan and linked package/architecture updates as a documentation-only PR. Runtime changes begin only after that merge.                                                                                      | Prepared; merge evidence belongs to the PR |
| 1. Registry foundation              | Implement typed registries, bundled mod contract, deterministic loading, duplicate checks, reference/value validation, sealed read APIs and isolated composition. Exercise lifecycle failure paths.                                         | Upcoming                                   |
| 2. Base catalog                     | Register current items, slots, stats, classes, abilities and remaining definition/config families in `core/src/mods/base.mod.ts`. Preserve IDs, values, ordering, generated loot and defaults. Derive compatibility views from the catalog. | Upcoming                                   |
| 3. Dependency migration             | Keep common types, structural schemas and pure geometry independent; move content-aware validators, inventory/equipment rules and bound geometry to core. Migrate all imports together, including test fixtures and offline save import.    | Upcoming                                   |
| 4. Playable runtime                 | Bind combat, training, spawns, loot, save/class enumeration, server startup and client startup to the ready context. Replace base-ID dispatch with supported behavior metadata where needed for extension.                                  | Upcoming                                   |
| 5. Presentation and extension proof | Derive class/slot/stat/item views and art selection from registered content. Run an extra fixture mod through actual rules, save/protocol and client view/prediction seams.                                                                 | Upcoming                                   |
| 6. Verification and documentation   | Run the checks below, reconcile docs to the delivered APIs and record actual results/limitations in the runtime PR.                                                                                                                         | Upcoming                                   |

Stages 1–5 are dependencies within the runtime implementation, not permission to
merge a disconnected registry scaffold as completed work. The runtime PR should
contain a coherent playable result. Implementation details may evolve, but scope
changes must be reflected in the canonical design and acceptance criteria.

## Migration checklist

- Audit `common/src/definitions`, `common/src/equipment.ts`, `common/src/inventory.ts`,
  class/slot schemas in `common/src/index.ts`, and content-dependent geometry in
  `common/src/world.ts`, `scene.ts` and `hitboxes.ts`.
- Audit the six existing core balance tables, fixed class/ability/enemy branches,
  startup-time derived constants and every import of old definition subpaths.
- Update server command parsing, character decode/save/class switching, merchant
  validation, repository/import tooling and session startup. Keep detached
  transactions and all existing legacy migration semantics.
- Update client class selection/images, equipment stat/slot views, action bar,
  local movement/projectiles, enemy health/hitboxes, scenery and effects.
- Ensure custom contexts reach the same rules as default startup. Do not solve
  isolated registry tests while leaving live helpers bound to base-only data.
- Inspect package exports/dependencies and search common for all core imports.
  Remove obsolete content tables rather than maintaining duplicate catalogs.

## Verification

Documentation stage: formatting, relative file/anchor links, source-path accuracy,
requirement-to-design coverage and a diff confirming no runtime changes. Do not
run gameplay suites solely to validate prose or present linked tests as executed.

Runtime stage uses the existing high-level seams wherever possible:

| Concern                          | Required evidence and existing seam                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registry lifecycle               | Base plus fixture mod; duplicate mod/definition IDs, invalid values/references, unsupported mechanics, no start on failure, immutable ready content and independent instances. Add focused core tests and include them in the executed package test command.                                                                                                                                                       |
| Base content and balance         | Carry forward the checks in [definition validation](../../packages/common/src/definitions/index.ts), currently invoked by [runtime startup](../../packages/server/src/runtime.ts), and preserve [balance tests](../../packages/core/src/utils/tests/balance.test.ts); compare relevant IDs, values and ordering, not only registry size.                                                                           |
| Real content extension           | Added item/slot/stat affect equipment totals and views; added class appears and saves independently; added ability/enemy use registered values in combat and prediction. Use public composition, not direct mutation of internal maps.                                                                                                                                                                             |
| Equipment/inventory transactions | [Equipment](../../packages/server/src/equipment.test.ts), [inventory](../../packages/server/src/inventory.test.ts), [Storehouse](../../packages/server/src/storehouse.test.ts); test unsupported IDs, full inventory, unarmed state and failed saves.                                                                                                                                                              |
| Saves and wire compatibility     | [Characters](../../packages/server/src/characters.test.ts), [protocol](../../packages/server/src/protocol.test.ts), [reconnect](../../packages/server/src/reconnect.test.ts); round-trip base and fixture IDs, old saves and isolated class records.                                                                                                                                                               |
| Combat and geometry              | [Classes](../../packages/server/src/classes.test.ts), [enemies](../../packages/server/src/enemies.test.ts), [training](../../packages/server/src/training.test.ts), [scenes](../../packages/server/src/scenes.test.ts), [local projectiles](../../packages/server/src/local-projectiles.test.ts) and [local movement](../../packages/server/src/local-movement.test.ts); forest/training parity and wrapped edges. |
| Browser smoke                    | [Gameplay](../../tests/gameplay.spec.ts), [equipment](../../tests/equipment.spec.ts), [action bar](../../tests/action-bar.spec.ts), [progression](../../tests/progression.spec.ts) and relevant inventory/Storehouse interactions after building. Check class selection, training, forest, prediction, item views and reconnects.                                                                                  |
| Dependency/build boundary        | `pnpm fmt:check`, `pnpm lint`, `pnpm typecheck`, core package typecheck/tests, `pnpm test` and `pnpm build`. Search for prohibited common-to-core edges and old content consumers; inspect generated browser/server startup.                                                                                                                                                                                       |

Add focused cases to existing suites where possible. New tests must prove runtime
behavior and validation failures rather than mirror private registry internals.
Use disposable SQLite databases. Report actual commands, passes/failures and any
unexecuted browser scenarios. This plan contains no claim that runtime checks
have already passed.
