---
name: research
description: Research a question against primary sources and report cited findings in the requested format. Use for substantive investigation, not a simple rewrite or translation.
license: MIT
metadata:
  upstream-repository: https://github.com/mattpocock/skills
  upstream-revision: 49dd158d1076134a641b33efb035946536778336
  upstream-path: skills/engineering/research
---

Read the [Emberfall integration rules](../../../docs/agents/skill-integration.md) before applying this workflow.

Check the actually installed dependency versions. Cite version-specific primary sources and distinguish measured game behavior from documentation and inference.

Use a background agent when delegation is available, permitted, and useful for independent reading; otherwise research directly. Honor a user request for direct work.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Cite the source supporting each substantive claim. Honor the requested format: answer inline for ordinary questions; write a report when a durable artifact is requested or useful to the task.
3. If saving a report, use the requested destination or the repository's existing convention. In projectless work honor the workspace deliverable rules. State the saved location.

## Local additions

- Prefer appropriate connected sources for private/workspace material and primary public sources for technical facts. Verify volatile facts live, and distinguish evidence, inference, and older unverified context.
- Respect exact product, region, version, format, and date constraints. Official product cards outrank search snippets for availability or specifications.
- Use `openai-docs` for OpenAI-specific guidance and the existing integrations skill when browser interaction or Google Drive work requires its routing. Research does not authorize purchases, messages, account changes, or execution of downloaded software.
