# Project-local engineering skills

The imported skills are editable project-local copies of
[mattpocock/skills](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336),
pinned to that revision. Each imported entrypoint records its source path and
revision; the upstream MIT notice is in `.agents/skills/LICENSE.mattpocock`.
The PR skill also retains its upstream `CREDITS.md`.

## Applying the workflows

Use the project-local copy when a global skill covers the same workflow. In
particular, `pr` supplies PR authoring here, `to-spec` supplies requirements work,
and `wait-what` supplies clarification of a previous explanation. The eight
`emberfall-*` skills remain the source of specialized runtime guidance. Read
only the skill and references relevant to the task; the upstream flow is a menu,
not a mandatory pipeline for every change.

These project rules take precedence over generic examples in the imported skills:

- Follow root and nested AGENTS instructions, including
  [communication](communication.md). Use [development](../development.md) for
  Node/pnpm versions, existing commands, and checks proportionate to the change.
- Preserve server authority, shared forest/training rules, wrapped geometry,
  runtime isolation, and save compatibility. Consult the affected package guide.
  Progression changes must satisfy [PROG-01](../specs/progression.md).
- Use [domain documentation](domain.md), [issue tracking](issue-tracker.md), and
  [triage labels](triage-labels.md) when the workflow needs them. Installation
  alone does not authorize tracker writes, commits, pushes, PRs, merges, hooks,
  dependency changes, or changes to global agent configuration.
- Continue work already authorized. Infer routine choices from the request and
  repository evidence; ask only for missing decisions that materially change
  scope or behavior. Interviews apply when requested or when the decision is
  genuinely unresolved, not as a prerequisite to a documented bug fix.
- In Codex, upstream “Skill tool” and `/skill-name` references mean reading the
  applicable local `SKILL.md` (explicit invocation uses `$skill-name`). Do not
  invent a Skill tool, `/clear`, or `/compact` action. Preserve context and use
  available handoff mechanisms only when needed. No fixed context-size estimate
  is a reliable limit for every model.
- Use available subagent tools only when the active workflow calls for them and
  session policy allows them. Otherwise perform the same scoped work serially.
  Give workers explicit ownership and tell them to preserve others' edits.
  A user-owned new chat is not an internal subagent.
- Use PowerShell on Windows. Bash templates require a verified Bash environment;
  otherwise translate the procedure to native PowerShell, preserving validation,
  hidden secret entry, and failure handling. Never run a template merely because
  it was installed. Keep secrets and player databases out of artifacts and Git.
- Use existing components and dependencies. Retain accessibility, trust-boundary
  validation and error handling even in prototypes. Nontrivial new logic needs a
  meaningful check; screenshots alone do not prove behavior or performance.

## Import scope and maintenance

Imported all 20 engineering skills, all seven productivity skills, and
`setup-pre-commit` with Oxfmt/pnpm adaptations. Kept the existing customizations
for review, design, debugging, research, TDD, and agent writing in those upstream
copies. PR authoring and specification skills incorporate the corresponding
existing requirements without adding duplicate local entrypoints.

Excluded `skills/in-progress/*` (seven experimental workflows),
`git-guardrails-claude-code` (Claude-specific hooks), `scaffold-exercises`
(course scaffolding), and `migrate-to-shoehorn` (an unrequested library migration).
No gameplay skill has an upstream equivalent that replaces its domain rules.

To update, compare with the recorded revision, retain project adaptations and
license/credits, validate frontmatter and links, and inspect positive, unrelated,
and near-miss routing examples. Preserve invocation policy: upstream explicit-only
skills use `policy.allow_implicit_invocation: false` in `agents/openai.yaml`.
Do not replace local copies blindly or modify the user's global skills.
