# Village workstations

`workstations.png` is a transparent 512 × 256 RGBA atlas with four columns and
two rows of 128 × 128 cells. Read cells in row-major order:

1. Cooking pot and hearth
2. Brewing barrel and copper kettle
3. Alchemy table
4. Writing desk with book and scroll
5. Forge anvil and hammer
6. Smelting furnace
7. Straw archery target
8. Leather stretching rack

Use source rectangles `(column * 128, row * 128, 128, 128)` and a common
bottom-center anchor `(64, 120)`. Eight transparent rows remain below each
object. These are static object bodies; the client supplies work animation
and effects without moving the base anchor.

## Provenance and packaging

Generated with the built-in OpenAI image generation tool on 2026-10-23 by the
delegated workstation-art agent, using `environment.png` as its style reference.
The original 1774 × 887 RGBA output remains at
`/workspace/generated_images/exec-4cb9af28-733b-4633-aa69-f457e0f5aa62.png`.
No external artwork was composited. This asset follows the collection's
CC BY-SA 3.0 distribution and retained LPC notices in [README.md](README.md),
`LPC-CREDITS.txt`, and `LPC-LICENSE.txt`.

Mechanical Pillow packaging cropped the following source rectangles
`(x, y, width, height)` and reduced all eight objects at one common scale
`108 / 407` with nearest-neighbor sampling. Trim bounds used alpha above 30
to ignore faint fringe; original alpha inside each crop was preserved.

| Object           | Source rectangle      |
| ---------------- | --------------------- |
| Cooking pot      | (58, 66, 367, 376)    |
| Brewing barrel   | (539, 35, 263, 407)   |
| Alchemy table    | (916, 136, 391, 306)  |
| Writing desk     | (1359, 81, 365, 361)  |
| Forge anvil      | (54, 492, 348, 351)   |
| Smelting furnace | (494, 457, 365, 383)  |
| Archery target   | (964, 473, 292, 360)  |
| Leather rack     | (1343, 473, 392, 365) |

Atlas SHA-256: `2227651cf736f74599bb374b2e0e2953f1f7f5df1d29e655575852d67cb2432e`.

## Generation instructions

Create eight isolated medieval workstation sprites in a four-column, two-row
grid, matching the environment sheet's warm pixel art, dark brown outlines,
walnut and ochre highlights, restrained palette, and slightly overhead front
view. In row-major order draw a suspended iron cooking pot over a stone hearth;
an oak brewing barrel with copper kettle and spigot; a wooden alchemy table
with three colored potion bottles and mortar; a writing desk with open book,
scroll and quill; a steel anvil with hammer on a wooden stump; a brick furnace
with glowing fire mouth and chimney; a straw target on wooden legs; and a tan
hide laced to a wooden stretching rack. Keep objects centered and grounded at
90 percent of each cell, with generous transparent gutters. No people, text,
labels, scenery, borders, ground shadows or painted checkerboard. Genuine alpha
transparency. These static bodies receive work effects from the runtime.

## Verification

Visually inspected the generated source and final packed atlas: all eight
objects are complete, distinct and correctly ordered, with readable small-scale
silhouettes, transparent background and no adjacent-cell clipping. Confirmed
RGBA output, zero-alpha source corner, transparent outer cell gutters and the
common bottom baseline. Runtime work effects and village integration require
the integrating task's actual-client inspection.
