# Documentation and skill maintenance

[Back to Development and verification](../development.md).

## Maintaining documentation and skills

Imported engineering workflows follow the [project skill integration rules](../agents/skill-integration.md), including upstream provenance, local overrides, tracker configuration and invocation policy.

Update the affected spec and design before implementing changed behavior; retain stable requirement IDs. For a bug restoring documented behavior, update only stale text. Add an implementation plan only when sequencing, dependencies or unresolved decisions need a durable record.

Repo skills live in `.agents/skills/<name>/SKILL.md`. Each needs `name` and `description` YAML frontmatter, a matching folder name and focused instructions. Keep automatic discovery enabled unless explicitly requested otherwise. The official [skill guide](https://developers.openai.com/codex/skills/) documents repository discovery. [AGENTS guidance](https://developers.openai.com/codex/guides/agents-md/) explains instruction scope; read nested files when working from the repository root because discovery alone does not load every descendant.

Validate new skills with the installed skill-creator's `scripts/quick_validate.py` when available, or inspect required frontmatter/names/placeholders manually. Check all relative links, including anchors. Try a positive request, an unrelated request and a near miss against each description. A format validator cannot prove correct workflow decisions. Do not add mandatory helper chains, a duplicate skill catalog, or a dependency just to validate prose.
