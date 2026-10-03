# Emberfall agent instructions

Read [communication rules](docs/agents/communication.md) for every task. Before editing a subtree, read its nested `AGENTS.md`; do not assume every descendant file was loaded automatically.

## Project constraints

- Emberfall is an online-only cooperative browser game. The server owns movement validation, damage, health, deaths, rewards and saves; client prediction is presentation only.
- Progression must not require a player choice or interrupt gameplay. Read [PROG-01](docs/specs/progression.md) before designing progression; no replacement system is selected yet.
- Reuse shared simulation in forest and training. Preserve wrapped geometry in both areas. Keep UI presentation separate from client actions and server rules.
- Keep credentials, SQLite data, certificates and generated output out of Git. Preserve asset credits and licenses.

## Find the right guidance

- [Documentation map](docs/README.md): implemented specs, technical designs and implementation plan. Update affected sources for behavior changes rather than appending feature history to README.
- [Development](docs/development.md): setup/check commands, skill maintenance and PR verification. Run checks proportionate to the change and report actual evidence.
- [Operations](docs/operations.md): HTTPS, hosting, saves and recovery.
- Package instructions: [common](packages/common/AGENTS.md), [server](packages/server/AGENTS.md), [client](packages/client/AGENTS.md), [UI](packages/ui/AGENTS.md).
- [Test instructions](tests/AGENTS.md) and [documentation instructions](docs/AGENTS.md) apply in those subtrees. Reusable workflows are discoverable under `.agents/skills/`; load only the relevant skill.

Use Node 24 and pnpm 11 with the committed lockfile. Keep changes focused, and do not turn a documentation task into a gameplay change. Create, push or merge PRs only within the user's requested scope; repository guidance is not standing authorization.
