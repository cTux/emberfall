# Development and verification

Run commands from the repository root unless stated otherwise. Runtime setup and HTTPS requirements are in [operations](operations.md).

## Commands

```sh
pnpm install --frozen-lockfile
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The formatter is Oxfmt; `pnpm fmt` writes formatting. `pnpm test` uses Node's test runner for `packages/server/src/*.test.ts`, including shared simulation and client helper tests. Build includes client, server and the static UI Storybook through Turborepo. No GitHub Actions workflow exists in the baseline; do not describe local checks as CI.

Both `pnpm build` and `pnpm build-new` compress PNGs through
[`vite-plugin-image-optimizer`](https://github.com/FatehAK/vite-plugin-image-optimizer)
in each client's Vite config, including copied public assets. Individual client
package builds do the same. PNG palette conversion is disabled to preserve sprite
pixels. Source assets, licenses and development serving are untouched. The plugin
logs byte savings and keeps original bytes when compression would increase size.
It strips image metadata and logs optimization errors while retaining the original
file. It does not preserve animated or high-bit-depth PNGs; exclude such assets in
the Vite config if introduced. Current sprites are static 8-bit PNGs.
Run `pnpm test:images` for real Vite build checks of both client configurations.

## Browser and UI verification

The independent runtime uses `pnpm dev-new`, `pnpm build-new`, and `pnpm start-new`.
`pnpm start-new` sets up HTTPS and builds both new packages before launching,
so a fresh checkout needs no separate build step after installing dependencies.
Its development client is on 5174 and its server on 3003. Use `PORT_NEW` and
`SAVE_PATH_NEW` for overrides; old commands remain scoped to old packages.
`pnpm typecheck-new` and `pnpm test-new` validate the new packages. Build before
`pnpm test:browser-new`; those tests own an in-memory server per test on 3013
(`TEST_PORT_NEW` overrides it), run sequentially, and never reuse a live database.
Functional browser tests use Balanced graphics; explicit rendering tests use
High. The [package guides](design/new-runtime.md) explain ownership and reuse.
`pnpm test:parity-new` checks import isolation, asset/credit hashes, definitions
and seeded simulation equivalence. `pnpm benchmark-new` measures simulation and
replication kernels; see the [verification record](plans/new-runtime.md) for scope.
`pnpm lint-new` checks the new source and styles. Use `pnpm import-save-new` only
with an offline backup and a new destination, as described in the
[server guide](../packages/server-new/README.md).

```sh
pnpm exec playwright install chromium
pnpm test:browser
pnpm --filter @emberfall/ui typecheck
pnpm --filter @emberfall/ui build
pnpm --filter @emberfall/ui test
```

Root Playwright starts the production server on port 3002 by default, uses HTTPS with the local certificate accepted for tests, and overrides `SAVE_PATH` to `:memory:`. Build first. `TEST_PORT` overrides the test server port. `TEST_DEV=1` starts the development setup instead; unlike the production test configuration it does not automatically set an in-memory database, so set an isolated save path explicitly when using it. The root suite runs one worker and does not reuse a running server.

The UI suite starts Storybook on port 6007; interactive Storybook uses 6006. It can reuse an existing server outside CI. See the [UI guide](../packages/ui/README.md) for component authoring and accessibility checks.

Focused examples:

```sh
node --test packages/server/src/classes.test.ts packages/server/src/training.test.ts
pnpm exec playwright test tests/combat-controls.spec.ts
node scripts/benchmark-snapshots.ts
```

Browser artifacts go to ignored `test-results/` and `playwright-report/` as configured by the suites. Treat screenshots as review evidence, not proof of unmeasured gameplay or performance.

For an opt-in hardware frame-budget measurement, build the new client, set
`PERF_NEW=1`, then run `pnpm test:browser-new tests-new/frame-budget.spec.ts`.
The isolated village, training, moving-forest and 80-enemy crowded cases use High at 1440×1000,
three seconds of warmup and 1,200 uncapped animation frames each. JSON records
include browser/GPU, frame percentiles and frames over the 240 FPS budget;
screenshots accompany them in `test-results/`. Windows uses ANGLE D3D11.
Set `PROFILE_NEW=1` to also capture CPU profiles; profiling adds overhead, so
compare runs with the same configuration. These samples do not guarantee 240 FPS
on other viewports, machines or arbitrary combat loads.

## Select checks by change

| Change                                   | Relevant verification                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prose, AGENTS or instruction-only skills | Formatting, relative links/anchors, source-path references, requirement/design consistency and skill frontmatter/routing; no gameplay suite solely for prose |
| Shared rules or network contract         | Lint, typecheck, relevant Node tests, build and affected browser scenario; include malformed input and authoritative ownership                               |
| Character persistence                    | Round-trip and legacy save tests, failure handling, isolated restart/reconnect tests; never experiment on a player's live database                           |
| Canvas or controls                       | Affected browser cases in both village/forest, seams and relevant settings; compare screenshots or timing evidence when the claim needs it                   |
| Shared UI                                | UI typecheck/build/tests, desktop/narrow layouts, keyboard/focus/reduced motion and affected client composition                                              |

Run broader checks when a failure, shared change or unresolved risk justifies them. Report exact commands and actual results; separate skipped checks from passing ones.

## Maintaining documentation and skills

Update the affected spec and design before implementing changed behavior; retain stable requirement IDs. For a bug restoring documented behavior, update only stale text. Add an implementation plan only when sequencing, dependencies or unresolved decisions need a durable record.

Repo skills live in `.agents/skills/<name>/SKILL.md`. Each needs `name` and `description` YAML frontmatter, a matching folder name and focused instructions. Keep automatic discovery enabled unless explicitly requested otherwise. The official [skill guide](https://developers.openai.com/codex/skills/) documents repository discovery. [AGENTS guidance](https://developers.openai.com/codex/guides/agents-md/) explains instruction scope; read nested files when working from the repository root because discovery alone does not load every descendant.

Validate new skills with the installed skill-creator's `scripts/quick_validate.py` when available, or inspect required frontmatter/names/placeholders manually. Check all relative links, including anchors. Try a positive request, an unrelated request and a near miss against each description. A format validator cannot prove correct workflow decisions. Do not add mandatory helper chains, a duplicate skill catalog, or a dependency just to validate prose.

## PR and merge

Use a focused `codex/` branch from the actual base. Include the problem, resulting behavior, affected areas and observed verification in the PR. Check the current head's checks and complete review/comment state before an authorized merge; green checks alone do not resolve actionable feedback. The baseline repository permits squash merging. Re-read repository settings when acting instead of assuming they stay unchanged. Do not override branch protection.
