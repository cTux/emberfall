# Emberfall agent instructions

Read [communication rules](docs/agents/communication.md) for every task. Before editing a subtree, read its nested `AGENTS.md`; do not assume every descendant file was loaded automatically.

## Project constraints

- Name tuning values, limits and timeouts at their owning definition and comment why the exact value is needed. Keep structural literals and named content/style data readable; follow [numeric values](docs/development/quality.md#numeric-values) and keep its lint rule enabled.

- Always use curly braces for `if`/`else` and loop bodies, including single statements; use block bodies with explicit returns for arrow functions and braces around nonempty `switch` cases. Keep `else if` chains and grouped empty case labels. See [lint policy](docs/development.md#lint-policy).
- Use single quotes for code string literals and JSX attribute values. Follow Oxfmt's escape-minimizing exceptions; JSON retains double quotes.
- When adding or refactoring code, follow [code structure and strict checks](docs/development/code-structure.md#code-structure): keep modules below 250 nonblank lines, split by responsibility, and use typed declarative definitions for repeated domain rules. Prefer [typed dispatch tables with named parameters](docs/development/code-structure.md#dispatch-tables) for choices keyed by one value. Separate functions and logical steps with [blank lines](docs/development/quality.md#blank-lines), including before `for`, `switch` and `if` statements.
- Emberfall is an online-only cooperative browser game. The server owns movement validation, damage, health, deaths, rewards and saves; client prediction is presentation only.
- Verify browser behavior on desktop. Skip mobile devices, mobile emulation, touch-only scenarios and phone-sized viewport/layout checks unless the user explicitly requests mobile testing; missing mobile coverage is not a completion or merge blocker.
- Progression must not require a player choice or interrupt gameplay. Read [PROG-01](docs/specs/progression.md) before designing progression; automatic leveling and optional talents are implemented.
- Reuse shared simulation in forest and training. Preserve wrapped geometry in both areas. Keep UI presentation separate from client actions and server rules.
- Core owns registries, bundled mods and content-aware rules; common owns contracts and pure geometry and must never import core. Start content work in [the core guide](packages/core/README.md) and preserve saved/wire IDs.
- Every item and entity must have its own generated image or sprite frames, matching the game's existing art style. Generate large source images; resize shipped copies through Vite plugins to their actual render needs. Ship and wire that artwork with the feature; emoji, generic icons and another item's or entity's artwork do not satisfy this rule. Follow [artwork delivery](docs/development/artwork.md#artwork-delivery) for sizing and verification.
- Every new feature must update its affected documentation and include a committed visual representation (animated or static image) embedded in those docs. Label concept previews separately from verified gameplay captures.
- Keep credentials, SQLite data, certificates and generated build output out of Git. Commit shipped artwork with its credits and licenses.

## Find the right guidance

- [Local skill integration](docs/agents/skill-integration.md): prefer project-local upstream skills for overlapping workflows; use the existing Emberfall skills for runtime-specific rules.

- [Documentation map](docs/README.md): implemented specs, technical designs and implementation plan. Update affected sources for behavior changes rather than appending feature history to README.
- [Development](docs/development.md): setup/check commands, skill maintenance and PR verification. Run checks proportionate to the change and report actual evidence.
- [Operations](docs/operations.md): HTTPS, hosting, saves and recovery.
- Package instructions: [common](packages/common/AGENTS.md), [core](packages/core/AGENTS.md), [server](packages/server/AGENTS.md), [client](packages/client/AGENTS.md), [UI](packages/ui/AGENTS.md).
- [Test instructions](tests/AGENTS.md) and [documentation instructions](docs/AGENTS.md) apply in those subtrees. Reusable workflows are discoverable under `.agents/skills/`; load only the relevant skill.

Use Node 24 and pnpm 11 with the committed lockfile. Keep changes focused, and do not turn a documentation task into a gameplay change. After every batch of code changes requested by a user prompt, create a PR and merge it after verification and review checks pass. Respect branch protection and report blockers instead of bypassing checks.
