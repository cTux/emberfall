# Issue tracking

This checkout's origin is `cTux/emberfall` on GitHub. Resolve the current remote
before acting; use `gh` or the available GitHub tools. Read the full issue body,
comments, labels and linked specification before implementing or triaging it.

For read-only discovery, use `gh issue view <number> --json
number,title,body,labels,comments` or `gh issue list`. Resolve whether a bare
number identifies an issue or PR. External PRs are not a general triage queue;
review explicitly named PRs within the user's scope.

Publishing means creating or updating GitHub issues only when the user requested
that action or explicitly invoked a publishing workflow. Otherwise prepare the
spec or ticket drafts locally under `docs/plans/`. Specs remain authoritative in
`docs/specs/`, with technical decisions in `docs/design/`; an issue links to them.
Use `--body-file` for multiline GitHub text and read back every authorized write.

## Wayfinding operations

When a map is requested, use a parent issue and child decision issues. Discover
the installed CLI/API capabilities before creating sub-issue or blocking links.
Prefer native dependencies; if unavailable, use linked task lists and explicit
`Blocked by` references. The ready set contains open children with no open
blockers and no active claim. Claims, labels, comments and closure must remain
within the authorized map workflow. Preserve other sessions' claims and edits.

Implementation alone does not close an issue or authorize a merge. Follow the
[repository PR rules](../development/pull-requests.md#pr-and-merge) and report actual readiness.
