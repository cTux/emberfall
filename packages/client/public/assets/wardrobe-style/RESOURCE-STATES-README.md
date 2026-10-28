# Resource scenery states

Generated on 2026-10-28 by GPT-6 Astra using built-in OpenAI image_gen.imagegen. The underlying image-model identifier is not exposed by the tool. The environment.png, plants.png, gathered.png and buildings.png assets were inspected and supplied as style references only. No external artwork was composited.

Source: resource-states-source.png, 1536 x 1024 RGBA. Original retained at E:\projects\.codex\generated_images\01a18373-4251-7d83-b68c-99d1dc954835\exec-05a0c60e-9a01-42e3-9827-edb469ea29d0.png.

Seven delivered files are 128 x 128 RGBA. Mechanical Pillow extraction only: split into 384 x 512 cells, crop each visible generated silhouette using alpha > 32 bounds (low-opacity background specks outside those crop rectangles are discarded; alpha values inside the rectangles are preserved), uniformly resize by 0.3 with nearest-neighbor sampling, trim transparent edge pixels introduced by sampling, center horizontally, paste onto transparent 128px cell with bottom-exclusive alpha coordinate 120. Generated alpha preserved; no repainting, shadow removal, palette edits, procedural art, or replacement pixels. Same scale for live and depleted stone.

## Exact generation prompt

Use case: stylized-concept. Create a transparent game scenery sprite atlas in the exact warm detailed pixel-art / painted pixel-cluster style of the attached Emberfall environment, plants, gathered and buildings reference images. References are style and species only. Seven distinct sprites in a precise 4 columns x 2 rows grid on a 1536x1024 transparent canvas: each cell 384x512; last bottom-right cell EMPTY transparent. Row1 left to right: (1) live STONE node: low loose cluster of small pale cream-grey rounded limestone stones, no mossy boulder, (2) depleted STONE node: just three tiny pale chips and sparse residual pebbles in same footprint, much lower than live node, (3) harvested fern: cut dark green frond stalks, distinctive curled fern fiddlehead and small divided fern leaf remnants, (4) harvested berry bush: cropped woody branching twigs and sparse small oval leaves, no berries. Row2 left to right: (5) harvested meadow grass: short golden-green stubble tuft of narrow sliced blades, no seed heads, (6) harvested violet wildflowers: short thin cut green stems with broad rounded basal leaves and two fallen purple petal fragments, no intact flowers, (7) harvested flowering herb: short cut stalks with pointed broad herb leaves and two fallen cream-white petals, no intact flowers, (8) completely empty. Every sprite centered horizontally in its cell, bottommost visible pixel at cell y=440, width about 270px; stone live height about160px; all depleted states height80-125px. Transparent padding and wide gutters. Match slightly elevated front view, dark crisp outlines, olive green plants, ochre highlights, hand-painted clustered pixels. Self shading allowed but absolutely NO CAST SHADOWS, no ellipses, no floor, no ground tile or soil patch, no background, no text, no grid lines, no labels, no frames. Genuine RGBA transparent alpha background. Keep each of seven silhouettes distinct and readable at 128px.

Tool options: transparent_background: true; referenced_image_paths listed the four wardrobe-style reference files above. No CLI fallback.

## Exact extraction rectangles

Coordinates are left, top, right-exclusive, bottom-exclusive.

| File                            | Source alpha crop      | Scaled size | Paste position |
| ------------------------------- | ---------------------- | ----------- | -------------- |
| stone-node.png                  | [30, 251, 382, 498]    | (106, 74)   | (11, 46)       |
| stone-gathered.png              | [425, 360, 742, 498]   | (95, 41)    | (16, 79)       |
| gathered-fern.png               | [789, 227, 1126, 496]  | (101, 81)   | (13, 39)       |
| gathered-berry-bush.png         | [1172, 257, 1507, 500] | (100, 73)   | (14, 47)       |
| gathered-meadow-grass.png       | [44, 725, 354, 933]    | (93, 62)    | (17, 58)       |
| gathered-violet-wildflowers.png | [429, 721, 734, 936]   | (92, 64)    | (18, 56)       |
| gathered-flowering-herb.png     | [793, 706, 1102, 935]  | (93, 69)    | (17, 51)       |

## Licence and inspection

These generated assets follow the collection CC BY-SA 3.0 distribution and retained LPC notices in README.md. The four reference files remain unchanged. Visually inspected source over a neutral opaque background and seven final-size exports: distinct pale limestone versus existing dark mossy boulder, reduced stone chips, fern curl/divided leaves, woody berry twigs, grass stubble, violet petals/rounded leaves, ivory petals/pointed herb leaves. No painted ground or cast shadows. Source RGB contains colors beneath zero alpha; neutral-background compositing confirms these are invisible. All output corners have alpha zero and all silhouettes share bottom-exclusive y=120. Runtime shadow creation and game integration are verified by the integrating task; asset checks alone do not establish in-game rendering.
