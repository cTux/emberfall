# Graphics presets and renderer

[Back to Graphics and visual feedback](../graphics.md).

## GRAPHICS-01 — Presets and renderer

Settings contains Low, Balanced and High (default) presets, plus persistent individual toggles. High enables soft projected tree shadows, 2D contact ambient occlusion, dense grass clusters, sprite-only motion blur, flickering campfire/player lighting, bloom, and ambient particles. Resolution options are 75%, native and 150% supersampling, with backing pixel density capped at 3x. Changes apply immediately and do not change server simulation or collision geometry.

**Smooth textures** enables linear texture filtering in both areas and is enabled
in every preset. Disabling it restores nearest-neighbor pixel edges immediately;
the choice persists across reloads. World text uses smooth sampling independently
of sprite filtering, and canvas CSS scaling stays smooth at fractional zoom.

Settings → Graphics includes a **Font** selector for Alegreya Sans (default),
Inter, Source Sans 3 and Atkinson Hyperlegible Next. The choice applies to the
entire interface, world labels, chat bubbles and damage numbers without rejoining
the world, and persists on this browser across reloads. Fonts and licenses ship
locally; font loading failure retains a working font. Missing or invalid saved
choices use Alegreya Sans. Graphics presets do not reset the font choice.
Actor, NPC and scenery atlases retain twice their logical cell resolution (128px actors and 256px trees). Village buildings use native-resolution crops of the approved regenerated sheet, with uniform scaling that preserves each building's source aspect ratio and existing world width. Their height follows that ratio, with a bottom-center ground anchor. Shadow masks use the same crops and dimensions; chimney smoke follows measured chimney positions. Cached scenery frames preserve that detail; animation timing and graphics settings stay unchanged.

Entity artwork uses gentler, material-colored dark tones and slightly reduced
contrast, preserving transparency, frame bounds and gameplay warning colors.

Settings include sunlight shafts, soft-light color grading, adaptive resolution and frame caps (display refresh, 30/60/120/144 FPS). Adaptive resolution adjusts the selected render scale between 50% and 100% every two seconds based on frame time; it never changes world size, input cadence or collision geometry. Low/Balanced enable adaptation; High prioritizes fixed resolution. Red gameplay warnings remain enabled at every preset. Native DLSS, frame generation, hardware ray tracing, depth-buffer SSAO and HDR output are not advertised as supported. PixiJS does not introduce those native rendering features.

High defaults to 150% supersampling and display-refresh frame pacing. Low uses native scale with adaptive resolution; Balanced uses native scale with adaptation, shadows, contact occlusion, dynamic lighting, vignette, color grading, particles and vegetation sway. Preferences can be adjusted individually.
