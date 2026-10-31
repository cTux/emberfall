# Commands and CI

[Back to Development and verification](../development.md).

## Commands

The [Verify workflow](../../.github/workflows/verify.yml) always runs formatting,
lint, typechecking, core and root Node suites, and builds on every pull request.
Pull requests also run affected desktop browser scenarios selected by
[browser selection](../../scripts/ci-browser-tests.ts). Unmapped and shared-runtime
changes fall back to
the complete 11-file desktop baseline plus shared UI checks. Desktop allowlists
exclude existing mixed phone/touch scenarios.

For a release candidate, run **Actions → Verify → Run workflow** on
`main` (CLI: `gh workflow run verify.yml --ref main`). Manual runs always execute
the complete desktop baseline and shared UI checks. A successful manual run on
current `main` triggers Pages deployment of that exact SHA. Intermediate merges
do not repeat the PR run. A stale release is rejected before building and
before deployment. See [operations](../operations/github-pages.md#github-pages-client-with-a-server-on-your-machine).
Browser tests use disposable certificates/databases; failures retain CI artifacts.
Git checks text out with LF on every platform through `.gitattributes`.

```sh
pnpm install --frozen-lockfile
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The formatter is Oxfmt; `pnpm fmt` writes formatting. `pnpm test` uses Node's test runner for `packages/server/src/*.test.ts`, and `tests/*.test.ts`, including shared simulation, client helpers and asset checks. Build includes client, server and the static UI Storybook through Turborepo. The [GitHub Pages workflow](../../.github/workflows/deploy-pages.yml) builds and deploys the fully verified client after a successful manual Verify run on current `main`; local verification commands remain separate from deployment.

Node suites are grouped by behavior, such as cast admission, companion lifecycle,
NPC reply scheduling and persistence. Related suites share their domain's
`*.fixture.ts` factories; per-file hooks stay in the test modules. Fixtures are
not test entry points. Keep server test files directly in `packages/server/src`
and core registry tests in `packages/core/src/content/tests` so the existing
runner globs discover them. Cross-package presentation fixtures live in `tests`
so production package dependency rules still apply. When splitting suites, preserve case bodies,
parameterized cases and hook scope, then verify discovery and the complete suite.

Browser suites retain their `*.spec.ts` entry points and import focused
`*.cases.ts` groups. These groups are not separately discovered, so existing
commands, CI selectors and per-entry hooks continue to apply. Shared setup lives
in `*.fixture.ts` modules. Screen composition stories retain their named exports
in `Screens.stories.tsx`, with private render components in `stories/screens`.
The renderer pixel fixture keeps canvas ownership and comparison results in its
entry module and delegates surface, lighting, damage and loot probes to helpers.
