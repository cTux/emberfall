---
name: emberfall-performance
description: Profile and fix Emberfall client-new frame-time, allocation, texture or rendering regressions. Use for low FPS or render hot-path changes; excludes server capacity tuning, asset styling alone and unmeasured performance claims.
---

# Measure the frame that is slow

Read the [client guide](../../../packages/client-new/README.md) and
[benchmark setup](../../../docs/development.md). Establish the actual scene,
enemy/effect count, movement, viewport, preset, browser and GPU. Quiet village
performance does not establish crowded combat performance.

Build first. Run `PERF_NEW=1 pnpm test:browser-new tests-new/frame-budget.spec.ts`
with environment syntax appropriate to the shell; `PROFILE_NEW=1` records CPU
profiles. Tests own an isolated in-memory server. Preserve baseline artifacts
before another Playwright run replaces `test-results`. Compare the same workload,
warmup, settings and profiling mode; report mean and tail frame times, not just FPS.
Inspect GPU identity: software rendering and hardware results are not comparable.

Follow the measured hot stack before editing. Keep sprite/mask cache keys small:
use image identity plus frame coordinates, never concatenate an image data URL
inside the actor loop. That hashes the entire atlas for every visible actor.
Reuse the shared `spriteMask` WeakMap. Keep finite caches bounded and release
resources on disposal. Avoid per-frame readbacks, atlas baking, texture uploads,
geometry reconstruction and blur filters when a cached primitive suffices.

Separate visible motion from expensive light-mask invalidation: tiny idle body
breathing need not resize the occlusion silhouette each frame. Preserve actual
movement, animation silhouettes, owner isolation, wrapped positions and texture
revisions. Do not improve a benchmark by silently lowering the user's preset.

Repeat the same measured case after the change. Inspect forest/village screenshots
and affected effects at the relevant presets; check bounded texture/visual counts.
Report the exact measured limits. Never promise maximum FPS for all hardware or
loads, and never treat a screenshot, uncapped RAF count or green build alone as
proof of performance.
