---
name: emberfall-presentation
description: Change Emberfall Canvas visuals, input prediction, HUD, shared UI, settings or audio. Excludes authoritative combat rules and character-save migrations.
---

# Change Emberfall presentation

Read the affected [interface/audio](../../../docs/specs/interface-and-audio.md) or [graphics](../../../docs/specs/graphics.md) requirement and [presentation design](../../../docs/design/presentation.md). For movement or cast prediction, also read [movement design](../../../docs/design/movement.md).

Choose the existing owner: Canvas world rendering in client helpers, screen/network actions in the client, or controlled reusable components in `packages/ui`. For shared UI, follow its [component guide](../../../packages/ui/README.md); keep the guide's Storybook import intact.

- Use one wrapped camera/geometry for sprites, attachments, aim, effects and navigation. Check village and forest seams.
- Predict presentation only. Reconcile through existing timestamps, request IDs and acknowledgements; stop stale prediction instead of replaying missed attacks.
- Preserve cache lifetime and offscreen culling. Keep high-frequency actor drawing out of React state.
- Keep gameplay warnings readable at every graphics preset. Settings and effects must not change collision or simulation.
- Preserve text-entry/modal input boundaries, keyboard focus, reduced motion, audio gesture unlock and hidden-tab behavior.
- Progression feedback must not take focus, require a choice or block controls; see [PROG-01](../../../docs/specs/progression.md).
- Keep imported asset provenance and shipped credits in sync with [asset guidance](../../../docs/assets.md).

Choose affected browser cases and inspect visible behavior. For shared components include Storybook typecheck/build and relevant UI tests. For a performance claim record scene, settings and measured metric; the snapshot CPU benchmark alone does not establish FPS. Use [development](../../../docs/development.md) for commands.

Report what changed and distinguish automated assertions, visual inspection and measured performance.
