# Implementation plan and delivered baseline

This plan starts from the implemented game at `ee008ec`. It is a maintenance and sequencing map, not a proposal to rebuild existing features. Specifications describe the current baseline; [PROG-01](../specs/progression.md) is an accepted constraint on future work.

## Existing feature delivery map

All rows below are implemented. Each row names the implementation seams and acceptance sources to use when extending that feature.

| Order/dependency        | Capability                                                               | Implementation seams                                                           | Acceptance source                         |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------- |
| 1 — foundation          | Shared messages, wrapped geometry, HTTP(S)/WebSocket, world browser      | `common/index.ts`, `common/world.ts`, `server/worlds.ts`, `client/main.tsx`    | WORLD-01; network design                  |
| 2 — world identity      | Character/class saves, authorized world recovery, build reload checks    | `server/characters.ts`, `server/worlds.ts`, client connection/build code       | CHAR-01–03, WORLD-02                      |
| 3 — shared world        | Chat, village, doors, wardrobe, paths and interactions                   | `server/chat.ts`, `common/scene.ts`, client village and chat                   | CHAT-01–03, SCENE-01/02                   |
| 4 — scene lifecycle     | Votes, countdown, late join, pause/regenerate, boss and return           | `server/scenes.ts`, `common/simulation.ts`                                     | SCENE-03–05                               |
| 5 — combat              | Classes, ailments, enemies, scaling, Bear, training and rewards          | `common/class-combat.ts`, `simulation.ts`, `enemies.ts`, `training.ts`         | COMBAT-01–05                              |
| 6 — responsive controls | Timed movement, interpolation, predicted casts and F/G/manual input      | Server command queues; client `local-movement.ts`, `snapshots.ts`, `Arena.tsx` | UI-02; movement design                    |
| 7 — presentation        | HUD/Codex/settings, shared UI, graphics, audio, critters and diagnostics | `client` rendering/preferences/audio; `ui` components/theme/Storybook          | UI-01–05, GRAPHICS-01–04                  |
| Cross-cutting           | Hosting, saves, attribution, performance verification                    | Certificate script, build config, credits and test suites                      | Operations, assets and development guides |

Paths abbreviated in this table are under `packages/`. Exact links are in the [architecture](../design/architecture.md) and [feature map](../README.md).

## Documentation rollout

1. **Inventory and reconcile.** Compare README claims, source and existing tests. Preserve behavior, numerical rules and limitations; correct stale documentation without changing runtime behavior.
2. **Establish canonical documents.** Move feature rules into specs, explain system seams in technical designs, and separate hosting, verification and attribution. Keep the root README as setup and navigation. Preserve the UI README's Storybook role and original asset licenses.
3. **Add scoped agent guidance.** Put repo-wide invariants in root AGENTS, package/test/doc concerns in local AGENTS and communication rules in one linked reference. Add focused repo skills for recurring combat, session/save and presentation changes.
4. **Verify.** Check Markdown formatting, file/anchor links, source/test paths, feature coverage and skill structure/routing. Confirm the runtime, lockfile and asset files are unchanged. Record actual results in the PR.
5. **Publish and merge.** Create the documentation PR, inspect its complete current-head review/check state, squash merge when ready, and verify the merged commit. This step is authorized by the task that created this plan; the plan itself is not standing authorization for future merges.

The files for steps 1–3 are the deliverables of this change. Final verification and merge evidence belong to the PR so a static plan does not pretend to know a later GitHub state.

## Next gameplay work: decision required

No next gameplay feature is selected by this documentation change. The earlier run-level upgrade selector was rejected. Future progression must apply without required choices or gameplay interruption.

When a specific progression feature is requested:

1. Specify its automatic trigger, effect and lifetime. Resolve XP sources/thresholds, fractional values, class behavior, party balance, death/return/reset and reconnect semantics.
2. Design server-owned grants and any persistence/migration. Define idempotence and snapshot feedback; use existing hit/save paths rather than a second reward system.
3. Implement the smallest complete vertical slice across common/server/client. Keep all movement and combat available when a grant occurs.
4. Verify threshold boundaries, multiple grants, save/reconnect behavior, two-client independence and unobtrusive feedback using PROG-01 acceptance scenarios.

Do not implement thresholds, new currency, talent effects, a rune inventory, automatic upgrades or pre-run loadouts from this outline alone. They remain open product choices, not missing pieces of the current baseline.

## Ongoing maintenance

For a feature change, update its acceptance criteria and design seam, implement it, then record focused verification in its PR. Add a separate plan only for work that needs sequencing. Keep historical experiments and transient progress out of the specs and README; use Git history and PR evidence for those.
