# Domain documentation

Start at the [documentation map](../README.md). Emberfall keeps behavior and stable
requirement IDs in `docs/specs/`, technical ownership and decisions in
`docs/design/`, and sequencing/status in `docs/plans/`. Package README and AGENTS
files supply narrower implementation guidance. Read only affected sources.

Update those sources for intentional behavior/design changes; a bug restoring
documented behavior needs only correction of stale text. Keep specs, designs,
tests and the feature map consistent. Mark unresolved product decisions explicitly.
Do not choose a progression replacement while documenting it.

Use existing game and runtime terminology. If a glossary or ADR already exists,
consult it when relevant. Create a separate glossary or ADR only for a real gap
that the existing sources do not cover. Avoid duplicate requirements, decision
records, and empty documentation scaffolding.
