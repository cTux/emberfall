---
name: implement
description: Implement a piece of work based on a spec or set of tickets.
license: MIT
metadata:
  upstream-repository: https://github.com/mattpocock/skills
  upstream-revision: 49dd158d1076134a641b33efb035946536778336
  upstream-path: skills/engineering/implement
---

Read the [Emberfall integration rules](../../../docs/agents/skill-integration.md) before applying this workflow.

Update affected specs/designs before intentional behavior changes. Use the applicable emberfall-* guidance and runtime-specific checks.

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Call the Skill tool with "tdd" where possible, at pre-agreed seams.

Run focused checks and affected suites according to docs/development.md. Prose-only changes need no gameplay suite.

Once done, call the Skill tool with "code-review" to review the work.

Commit only when requested, on the appropriate working branch, with only task-owned changes.
