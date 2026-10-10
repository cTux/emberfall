---
name: code-review
description: Review a PR, branch, commit, or uncommitted change for standards, correctness, and spec compliance. Read-only unless fixes are requested; not a whole-repository audit.
license: MIT
metadata:
  upstream-repository: https://github.com/mattpocock/skills
  upstream-revision: 49dd158d1076134a641b33efb035946536778336
  upstream-path: skills/engineering/code-review
---

Read the [Emberfall integration rules](../../../docs/agents/skill-integration.md) before applying this workflow.

Review the affected specs/designs and package rules. Check server authority, runtime isolation, wrapped geometry, save ordering and accessibility where touched. Review is read-only unless fixes were requested.

Two-axis review of the change the user requests: a PR, branch, commit, staged changes, or working-tree changes:

- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

Discover the issue tracker and label vocabulary from repository instructions, configuration, and the referenced issue. Use existing conventions. Ask only if the destination remains ambiguous; use `setup-matt-pocock-skills` when repository setup is actually requested.

## Process

### 1. Pin the fixed point

Use the requested review target. For a PR, resolve its actual base and head. For a branch, use its established base. Without a named target, review uncommitted changes if present, otherwise the last commit. Ask only if the intended scope remains ambiguous.

Capture the exact commands and revision IDs. For a branch use `git diff <base>...HEAD` and `git log <base>..HEAD --oneline`. For staged changes use `git diff --cached`; for unstaged changes use `git diff`; for all uncommitted work inspect both plus `git ls-files --others --exclude-standard` and read new files. For the last commit use `git show HEAD`. Give both reviewers the same frozen diff/artifacts, including new files. If the tree changes, refresh affected evidence.

Verify named refs resolve and the requested change is non-empty, counting untracked files. Report an empty scope without starting reviewers. Record the head SHA and, for uncommitted work, the captured patch and new-file hashes.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.), fetched via the workflow in the tracker doc.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. Use requirements explicitly provided in this conversation when no document exists. If no requirements source is available, report "no spec available" and continue the Standards review. Ask only if missing requirements prevent a material correctness judgment.

### 3. Identify the standards sources

Search the repo for every file that documents how code should be written. When `CODING_STANDARDS.md` or `CONTRIBUTING.md` exists, it must be on the list.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.

Each smell reads _what it is_ → _how to fix_; match it against the diff:

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Spawn both sub-agents in parallel

Issue both sub-agent calls together, in the foreground, and aggregate the reports they return.

**Standards sub-agent prompt** should include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full (the sub-agent has no other access to it).
- The brief: "Report, per file/hunk where relevant, (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** should include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings, because the two axes are deliberately separate (see _Why two axes_).

End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes: that's the reranking the separation exists to prevent.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.

## Local additions

- This is read-only unless fixes are separately requested. Inspect connected code and every affected caller, not just diff lines.
- In the Standards review, include correctness, security, data loss, concurrency, expected load, meaningful tests, performance, and unnecessary code. Pass these checks to the Standards reviewer alongside the upstream baseline.
- Each finding needs a reachable scenario, evidence with file/line references, impact, and the smallest fix. A code smell alone is not a defect: report it only when its concrete maintenance or runtime cost is established. Prefer deletion/reuse over new layers.
- Treat documented `shortcut:` limits as intentional unless the expected use crosses them. State workload assumptions and what was not checked.
- Keep Standards and Spec separate, with severity within each. Bind conclusions to the reviewed revision; new changes invalidate affected evidence. Review success does not prove CI success, merge readiness, or runtime success.
