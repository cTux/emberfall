---
name: emberfall-new-client
description: Develop or test Emberfall client-new PixiJS rendering, presentation ECS, prediction, controls and shared UI composition. Excludes authoritative combat rules and work confined to the original Canvas client.
---

# New client rendering and interaction

Read the [client-new guide](../../../packages/client-new/README.md), its AGENTS,
and the affected graphics/interface requirement in the [documentation map](../../../docs/README.md).

Keep received schemas, detached snapshots, predicted poses and Pixi resources
separate. Use common-new geometry and rules. Camera, weapon, light and sound
must follow the same reconciled local action; replay must not duplicate effects.
Health, damage, loot and saved progression require server confirmation.

Reuse textures, sprite frames and gradient ramps. Group clips so particles can
batch; bake reusable glow primitives instead of filtering each spark. Bound
cache lifetimes and dispose resources on remount. Never substitute a whole
Canvas-rendered world texture for native Pixi rendering.

Sprite generation must be delegated to a `gpt-6-astra` agent (GPT-6 Astra).
That agent owns generation, visual inspection and asset provenance; use the
built-in image generation tool and existing art as the style reference. Do not
generate replacement sprites from another Codex model. Keep animation frames
at a stable scale and foot anchor, and verify the loop in the actual client.

Reuse controlled components from the [UI package](../../../packages/ui/README.md).
Read its instructions before editing it and verify both clients for shared API
changes. Keep browser identity keys isolated under `emberfall-new.*`.

Run typecheck, affected prediction tests, build and actual browser scenarios.
Use the test-owned Colyseus server fixture, inspect village/forest screenshots,
and cover relevant classes/settings/wrapped seams. Performance claims need a
scene, viewport, settings, GPU/browser and measured frame times; screenshots
alone are insufficient. Record actual results and remaining limitations.

For player art or locomotion changes, inspect `/?class-movement` across every
class and direction at game size and enlarged, both traveling and in place.
Feet must alternate planted/lifted contact with visible knee/boot movement,
including beneath robes. Torso bob, weapon changes and distinct whole-image
hashes do not prove a working gait. Compare lower-leg silhouettes across the
cycle, check the loop seam, transparent gutters, stable scale and weapon hands,
and run `tests-new/player-art.spec.ts` plus affected village/forest scenarios.
Preserve approved class identities and non-walk poses when replacing walk art.
When feedback accepts specific directions, preserve those cells and their scale
exactly. Inspect both half-cycles: each leg must take its turn leading/supporting;
a single centered boot pumping vertically or one unchanged trailing leg still
fails even when silhouette tests pass. Treat automated pixel checks as rejection
filters, never as visual approval. Compare opposite contact and passing poses.
