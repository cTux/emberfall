# Regenerated village buildings

`buildings.png` is the approved, unmodified 2172 × 724 RGBA source sheet,
generated with the built-in OpenAI image generation tool on 2026-10-28.
References were this directory's `environment.png` (building identities) and
`workstations.png` (material detail and finish). No external artwork was
composited. The collection's CC BY-SA 3.0 distribution and retained LPC notices
in [README.md](README.md), `LPC-CREDITS.txt` and `LPC-LICENSE.txt` apply.

SHA-256: `eb6101bb3375cc28fdfcd1be8b9b20282a1dd6d29bbe8bd2b8dbddbd4d3023f5`.

Runtime crops use alpha bounds at 32 to exclude faint generation fringe.
Original RGBA pixels inside each crop remain unchanged. No resampling,
square-cell packaging or tonal correction is applied to the cached sprites.

| Design           | Source rectangle (x, y, width, height) | Chimney within crop (x, y) |
| ---------------- | -------------------------------------- | -------------------------- |
| Tiled cottage    | (38, 41, 638, 652)                     | (453, 0)                   |
| Bannered hall    | (751, 19, 661, 674)                    | (521, 6)                   |
| Thatched cottage | (1461, 89, 689, 605)                   | (539, 0)                   |

Each building retains its existing world width and bottom-center anchor. Its
height uses the same scale as its width, preserving source proportions. Sun
shadows and nearby-light occlusion use masks made from those same native crops.
The gallery uses the same rectangles, proportions and chimney anchors.
The old environment sheet remains intact for its trees, rocks and other props.

## Generation prompt

Create a regenerated BUILDING ART PREVIEW for Emberfall, a cozy medieval
cooperative top-down browser RPG. Output one wide high-resolution transparent
PNG asset sheet with exactly THREE separate complete buildings in one
horizontal row, each with equal-sized square allocation, ample transparent gap,
consistent baseline and consistent scale, absolutely no clipping. Reference
image 1 is the existing environment sprite sheet: REGENERATE ONLY its three
buildings in the top row. Ignore every tree, bush, rock, lamp post and dummy in
that reference. Reference image 2 is the STYLE AND DETAIL QUALITY TARGET:
finely detailed small fantasy workstations, especially the anvil, furnace, and
wooden tables. The new buildings should have the same sophisticated
fine-grained painted sprite finish with small crisp detail, subtle rich
material shading, warm dark brown edge definition rather than thick black
outlines. Avoid large blocky pixels, coarse stair-stepped silhouettes, blur,
plastic 3D rendering, photorealism or overly busy decoration. Preserve the
charming original building identities and shapes: LEFT a compact cream-plaster
dark-timber cottage with a tall red clay tiled gabled roof, right stone chimney,
front wooden door with iron ring, blue shuttered window and small
white-flowered window box, lantern by door, barrels at right. CENTER a slightly
taller medieval guild hall with red clay gabled roof, right stone chimney,
dark half-timber frame, cream upper plaster, grey stone ground floor, arched
front door on left, blue shuttered windows, teal hanging banner with a small
gold tree motif, crates at lower right and hanging warm lantern at left. RIGHT
a low broad golden-thatched cottage with right stone chimney, cream plaster
and dark wood beams, front door slightly left of center, blue shuttered window
right, climbing green vine with little white flowers along the right facade
and roof edge, small stacked firewood left. Camera: same slightly elevated
frontal three-quarter view as original, see roof and slight side wall, no
isometric diamond base. Native finer detail, individual fine roof tiles, straw
strands in restrained clusters, delicate wood grain and stone joints, subdued
natural palette, readable silhouette. Match workstation palette and lighting
from upper left. These must look like high-quality game sprites at 256-512px
per building, not low-resolution artwork enlarged. NO text labels, captions,
grid lines, scene, backdrop, grass tile, characters, UI, additional objects,
comparison panels or extra buildings. Only the three fully isolated regenerated
building sprites on genuine transparent background.
