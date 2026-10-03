# Client instructions

- Read [presentation](../../docs/design/presentation.md) and, for input/network work, [movement](../../docs/design/movement.md).
- Keep high-frequency drawing outside React state. Predict visuals only; server snapshots own damage, roots, deaths and rewards.
- Project actors, scenery, attachments, aim and navigation through the same wrapped camera. Reuse existing caches and avoid full-map allocation/redraw on joins.
- Use `packages/ui` for shared UI. Client owns network actions, preferences, clocks and panel-position storage.
- Preserve keyboard/text-entry/modal boundaries and gesture/visibility audio behavior. Progression feedback must not take focus or require selection.
- For visual changes, verify the affected village and forest cases, relevant presets and narrow-screen/keyboard behavior. Keep performance claims tied to measured scenarios.
- Preserve original licenses and Codex credits for imported assets; see [assets](../../docs/assets.md).
