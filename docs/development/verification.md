# Select checks by change

[Back to Development and verification](../development.md).

## Select checks by change

Apply the [desktop verification rule](../../AGENTS.md#project-constraints) when selecting browser checks.

| Change                                   | Relevant verification                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prose, AGENTS or instruction-only skills | Formatting, relative links/anchors, source-path references, requirement/design consistency and skill frontmatter/routing; no gameplay suite solely for prose |
| Shared rules or network contract         | Lint, typecheck, relevant Node tests, build and affected browser scenario; include malformed input and authoritative ownership                               |
| Character persistence                    | Round-trip and legacy save tests, failure handling, isolated restart/reconnect tests; never experiment on a player's live database                           |
| Canvas or controls                       | Affected browser cases in both village/forest, seams and relevant settings; compare screenshots or timing evidence when the claim needs it                   |
| Shared UI                                | UI typecheck/build/tests, desktop layouts, keyboard/focus/reduced motion and affected client composition                                                     |

Run broader checks when a failure, shared change or unresolved risk justifies them. Report exact commands and actual results; separate skipped checks from passing ones.
