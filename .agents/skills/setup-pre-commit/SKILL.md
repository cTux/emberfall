---
name: setup-pre-commit
description: Configure requested Emberfall pre-commit hooks using pnpm, Oxfmt and existing checks. Does not install hooks during ordinary development.
license: MIT
metadata:
  upstream-repository: https://github.com/mattpocock/skills
  upstream-revision: 49dd158d1076134a641b33efb035946536778336
  upstream-path: skills/misc/setup-pre-commit
---

Read the [Emberfall integration rules](../../../docs/agents/skill-integration.md) before applying this workflow.

Configure hooks only when requested; installing this skill installs no hook or dependency. Retain pnpm and Oxfmt, with existing runtime checks.

# Setup Pre-Commit Hooks

## What This Sets Up

- **Husky** pre-commit hook
- **lint-staged** running Oxfmt on all staged files
- Existing **Oxfmt** defaults and ignore configuration
- **typecheck** and **test** scripts in the pre-commit hook

## Steps

### 1. Detect package manager

Use the committed pnpm lockfile and the Node/pnpm versions in package.json. Reuse existing hooks and staged-file configuration when present.

### 2. Install dependencies

Install as devDependencies:

```
husky lint-staged
```

### 3. Initialize Husky

```bash
pnpm exec husky init
```

This creates `.husky/` dir and adds `prepare: "husky"` to package.json.

### 4. Create `.husky/pre-commit`

Write this file (no shebang needed for Husky v9+):

```
pnpm exec lint-staged
pnpm typecheck
pnpm test
```

**Adapt**: These commands cover the original runtime. Select the affected old/new runtime checks from docs/development.md; prose-only commits need no gameplay tests.

### 5. Create `.lintstagedrc`

```json
{
  "*": "oxfmt --write"
}
```

### 6. Preserve formatter configuration

Reuse Oxfmt configuration and .oxfmtignore. Verify staged-file handling with the installed formatter. Select checks for the affected runtime.

### 7. Verify

- [ ] `.husky/pre-commit` exists and is executable
- [ ] `.lintstagedrc` exists
- [ ] `prepare` script in package.json is `"husky"`
- [ ] Existing formatter defaults and ignore configuration are preserved
- [ ] Run `pnpm exec lint-staged` to verify it works

### 8. Commit

If committing was requested, stage only task-owned files and commit with message: `Add pre-commit hooks (husky + lint-staged + oxfmt)`

This will run through the new pre-commit hooks: a good smoke test that everything works.

## Notes

- Husky v9+ doesn't need shebangs in hook files
- Exclude unsupported binary files from staged formatter input.
- The pre-commit runs lint-staged first (fast, staged-only), then full typecheck and tests
