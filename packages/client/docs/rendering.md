# Render resource rules

[Back to PixiJS client](../README.md).

Code paths in this guide are relative to `packages/client` unless prefixed with another package or repository directory.

## Render resource rules

Reuse source textures and mutable sprite frames. Cache gradient color ramps
independently of camera position. Reuse baked particle glows rather than applying
a blur filter to every spark. Release textures, masks, text and pools when the
renderer is disposed; trim unused caches. Keep rendering at viewport resolution
and honor the existing graphics settings. Moving lights need distinct canvas
sources and explicit texture revisions so one light cannot overwrite another.

The damage flash uses numeric `globalAlpha` with a constant red fill so its final
fade frames cannot send scientific-notation opacity strings to Pixi's color parser.
`tests/damage-flash.spec.ts` compares its start, midpoint and expiry against
Canvas 2D, including a fractional timestamp just before expiry.

The canvas exposes read-only `data-renderer` and `data-render-stats` diagnostics
for profiling. A successful build or screenshot does not establish performance;
record scene, viewport, settings, browser/GPU, warmup and frame-time distribution.
