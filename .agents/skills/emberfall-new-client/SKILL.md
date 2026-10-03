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

Reuse controlled components from the [UI package](../../../packages/ui/README.md).
Read its instructions before editing it and verify both clients for shared API
changes. Keep browser identity keys isolated under `emberfall-new.*`.

Run typecheck, affected prediction tests, build and actual browser scenarios.
Use the test-owned Colyseus server fixture, inspect village/forest screenshots,
and cover relevant classes/settings/wrapped seams. Performance claims need a
scene, viewport, settings, GPU/browser and measured frame times; screenshots
alone are insufficient. Record actual results and remaining limitations.
