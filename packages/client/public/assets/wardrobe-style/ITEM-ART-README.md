# Dedicated inventory item art

Generated on 2026-10-28 by the GPT-6 Astra agent using built-in OpenAI `image_gen.imagegen`. The tool does not expose the underlying image-model identifier. Existing `health-potion.png` and `mage-weapon.png` were supplied as style references only.

## Source and exports

The original 1254 × 1254 RGBA source is retained as `item-source-atlas.png`, copied unchanged from:
`E:/projects/.codex/generated_images/01a18373-1957-7e40-b31b-82d5d57b1e56/exec-9291a168-ec93-4f11-a81c-9efdaa2d04ef.png`.

Each finished item is a separate 96 × 96 RGBA PNG named `item-{ID}.png`. A regular 4 × 4 grid was mechanically cropped using Pillow, then reduced with nearest-neighbor sampling. No painting, recoloring, background replacement or procedural substitute was applied. Generated alpha is preserved, including the source's faint alpha=1 encoding noise in otherwise transparent gutters. Cell edges contain no alpha greater than 1; there are no visible baked floor shadows.

Crop rectangles below use source pixels, left/top inclusive and right/bottom exclusive.

| ID               | Crop rectangle       |
| ---------------- | -------------------- |
| loot-gloves      | 0, 0, 314, 314       |
| loot-helmet      | 314, 0, 627, 314     |
| loot-bodyArmor   | 627, 0, 940, 314     |
| loot-leggings    | 940, 0, 1254, 314    |
| loot-boots       | 0, 314, 314, 627     |
| loot-amulet      | 314, 314, 627, 627   |
| loot-ring        | 627, 314, 940, 627   |
| loot-shield      | 940, 314, 1254, 627  |
| loot-quiver      | 0, 627, 314, 940     |
| loot-orb         | 314, 627, 627, 940   |
| loot-natureFocus | 627, 627, 940, 940   |
| log              | 940, 627, 1254, 940  |
| stick            | 0, 940, 314, 1254    |
| leaf             | 314, 940, 627, 1254  |
| rock             | 627, 940, 940, 1254  |
| stone            | 940, 940, 1254, 1254 |

## Exact generation prompt

Use case: stylized-concept. Asset type: Emberfall inventory item source atlas, 16 distinct finished colored icons in an exact 4-column by 4-row regular grid on a square transparent canvas. The supplied potion and staff are STYLE REFERENCES ONLY. Match their warm dark brown contours, muted jewel and earth colors, chunky hand-painted pixel-art material clusters and upper-left highlights. No reference items reproduced. Every equal cell holds exactly one completely isolated centered icon, with at least 15% transparent margin inside every cell, no element crossing cell boundaries. All 16 icons same visual weight, readable at 36px; finished colored objects, never monochrome slot silhouettes. Exact row-major order: row1: a pair of reddish brown leather GLOVES with brass cuffs; steel and bronze open-face HELMET; teal padded BODY ARMOR with bronze shoulder plates; brown leather LEGGINGS with muted teal knee guards. Row2: pair of brown leather BOOTS; gold AMULET necklace with emerald pendant; chunky gold RING with red inset gem; round wooden SHIELD with steel rim and brass boss. Row3: brown leather QUIVER holding three feathered arrows; violet magical ORB cradled in small brass base; NATURE FOCUS of curled wood encircling a green gemstone with two leaves; short cut LOG with dark brown bark and visible tan growth rings. Row4: a single forked brown STICK; single broad green LEAF with visible stem; rough angular gray ROCK chunk; smooth rounded blue-gray STONE pebble. Rock must visibly differ from rounded stone. Quiver, orb, nature focus and shield must each be their own unmistakable object. Genuine transparent alpha between and outside objects, no floor or contact shadows, no background, no opaque grid, no lines, no text, no labels, no numbers, no frame, no glow halo, no watermark, no emoji, no photorealism. Square source atlas with exactly 16 equal cells in 4x4.

Tool options: `transparent_background: true`; `referenced_image_paths` contained the two local style-reference paths above. No CLI fallback was used.

## Inspection and license

Visually inspected the full generated source and `item-contact-sheet-36px.png`, where every icon is rendered at exactly 36 × 36 pixels on a dark panel. All 16 subjects are present; quiver, orb, nature focus and shield are independent recognizable objects. The angular gray rock and rounded blue-gray stone remain distinct. The exported icons have transparent backgrounds without visible floor shadows. Mechanical assertions checked source-cell gutters and all exported dimensions, RGBA format and distinct pixel content. Actual client integration and runtime verification belong to the integrating task; a contact sheet alone does not establish in-game behavior.

These assets follow the collection's CC BY-SA 3.0 distribution and retained LPC attribution/license notices in [README.md](README.md), [LPC-CREDITS.txt](LPC-CREDITS.txt) and [LPC-LICENSE.txt](LPC-LICENSE.txt).
