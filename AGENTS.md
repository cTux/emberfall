# Emberfall agent instructions

Read [communication rules](docs/agents/communication.md) for every task. Before editing a subtree, read its nested `AGENTS.md`; do not assume every descendant file was loaded automatically.

## Project constraints

- Use single quotes for code string literals and JSX attribute values. Follow Oxfmt's escape-minimizing exceptions; JSON retains double quotes.
- Emberfall is an online-only cooperative browser game. The server owns movement validation, damage, health, deaths, rewards and saves; client prediction is presentation only.
- Progression must not require a player choice or interrupt gameplay. Read [PROG-01](docs/specs/progression.md) before designing progression; no replacement system is selected yet.
- Reuse shared simulation in forest and training. Preserve wrapped geometry in both areas. Keep UI presentation separate from client actions and server rules.
- Core owns registries, bundled mods and content-aware rules; common owns contracts and pure geometry and must never import core. Start content work in [the core guide](packages/core/README.md) and preserve saved/wire IDs.
- Every item and entity must have its own generated image or sprite frames, matching the game's existing art style. Ship and wire that artwork with the feature; emoji, generic icons and another item's or entity's artwork do not satisfy this rule. Follow [artwork delivery](docs/development.md#artwork-delivery).
- Every new feature must update its affected documentation and include a committed visual representation (animated or static image) embedded in those docs. Label concept previews separately from verified gameplay captures.
- Keep credentials, SQLite data, certificates and generated build output out of Git. Commit shipped artwork with its credits and licenses.

## Find the right guidance

- [Local skill integration](docs/agents/skill-integration.md): prefer project-local upstream skills for overlapping workflows; use the existing Emberfall skills for runtime-specific rules.

- [Documentation map](docs/README.md): implemented specs, technical designs and implementation plan. Update affected sources for behavior changes rather than appending feature history to README.
- [Development](docs/development.md): setup/check commands, skill maintenance and PR verification. Run checks proportionate to the change and report actual evidence.
- [Operations](docs/operations.md): HTTPS, hosting, saves and recovery.
- Package instructions: [common](packages/common/AGENTS.md), [core](packages/core/AGENTS.md), [server](packages/server/AGENTS.md), [client](packages/client/AGENTS.md), [UI](packages/ui/AGENTS.md).
- [Test instructions](tests/AGENTS.md) and [documentation instructions](docs/AGENTS.md) apply in those subtrees. Reusable workflows are discoverable under `.agents/skills/`; load only the relevant skill.

Use Node 24 and pnpm 11 with the committed lockfile. Keep changes focused, and do not turn a documentation task into a gameplay change. Create, push or merge PRs only within the user's requested scope; repository guidance is not standing authorization.
