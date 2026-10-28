# Storehouse and Lodge building extensions

Generated 2026-10-28 by the delegated GPT-6 Astra (`gpt-6-astra`) building-art agent with built-in OpenAI `image_gen.imagegen`; the tool does not expose the underlying image-model identifier. Both calls used `transparent_background: true` and `buildings.png` as the explicit image-edit reference, preserving the original front-facing camera, chunky shingles and timber/plaster palette. No external artwork was composited. Preserve this collection's distribution and attribution notices in `README.md`, `LPC-CREDITS.txt` and `LPC-LICENSE.txt`.

## Source and export measurements

Source directory: `E:/projects/.codex/generated_images/01a18373-73a8-7a63-a8bd-37d9ba4771a8/`.

| Export                  | Source PNG                                    | Native size | Crop (x, y, width, height) | Export size | Visible alpha bounds >30 |
| ----------------------- | --------------------------------------------- | ----------- | -------------------------- | ----------- | ------------------------ |
| building-storehouse.png | exec-ef07307e-a603-4977-9669-4fbd36925824.png | 1374 x 1145 | (67, 9, 1277, 1091)        | 768 x 656   | (5, 5, 763, 651)         |
| building-lodge.png      | exec-ced1eba6-8e86-4115-afc9-a384d2499105.png | 1286 x 1223 | (74, 22, 1132, 1141)       | 762 x 768   | (5, 5, 757, 763)         |

Crop bounds use alpha >30 plus eight native pixels of padding. Pillow nearest-neighbor reduction preserves aspect ratio to longest edge 768; original RGBA is retained. Bounds are left/top/right/bottom, with right/bottom exclusive. Nonzero-alpha bounds including faint fringe: Storehouse (3, 3, 768, 655), Lodge (3, 0, 761, 767).

Storehouse has no chimney. Lodge chimney mouth center measured visually at native source (943, 48), transformed to export **(585, 18)**; normalized **(0.768, 0.0234)**. Existing bottom-center anchors and world widths remain renderer responsibilities. Use natural aspect ratios; never force square dimensions. Derive cast shadows at runtime, using the established alpha threshold rather than faint generated fringe.

## Selected prompts

### Storehouse

EDIT the provided existing building sprite atlas into ONE new STOREHOUSE building, as a faithful sibling of the LEFTMOST original house. Preserve that original's exact rendering style, FRONT-FACING camera (not isometric), upright vertical facade, broad centered gable, roughly square height-to-width, large chunky red-orange shingles, thick warm brown beams, cream plaster, grey block foundation, dark outlines and same coarse detail density. Keep the same facade geometry and roof profile, changing only identity details: replace single door and adjacent window with two broad CLOSED plank storage doors centered in lower facade, add a small loft shutter in gable and neat stacked crates at right. No sign, lettering or text. NO angled side wall, no diagonal receding foundation, no miniature fine-grain texture, no elongated low warehouse. Output ONLY the one complete storehouse on genuine transparent alpha background, no other buildings, no terrain or cast/ground shadow, no glow, no people. Maintain reference proportions precisely. No chimney needed.

### Lodge

EDIT the provided existing building sprite atlas into ONE new woodland LODGE building, a faithful sibling of the LEFTMOST original house. Preserve its exact artistic style, FRONT-FACING camera, upright facade vertical edges, broad centered gable, approximately square height-to-width ratio, large chunky shingles, thick warm brown timber beams, cream plaster, grey stone blocks, dark outlines and same coarse detail density. Keep the same front facade geometry and roof profile. Change only identity details: roof shingles muted moss-green but otherwise same large reference shingle shapes; single closed wooden door at left, warm blue-paned window at right, small carved oak-leaf wooden emblem centered in front gable, simple antlers mounted above door. Keep a grey stone chimney upper right, with a visible dark mouth and NO smoke. No side extension, NO isometric camera, NO diagonal receding foundation, NO steep tall narrow cabin, NO fine-grain miniature texture. Output ONLY the complete single Lodge on genuine transparent alpha background, no other buildings, no terrain, no ground/cast shadow, no glow, no people, no lettering/text/sign. Preserve reference style and proportions precisely.

## Verification

Inspected both generated sources, RGBA bounds and exports. Compared all five buildings on the same green background at 128 pixels visible width, with a common bottom baseline: original Inn, Hall and Cottage alongside revised Storehouse and Lodge. The comparison is saved as `buildings-all-five-128.png` in the task visualization folder. New sprites have front-facing facades, large shingles and upright edges; Storehouse excludes a chimney and therefore has a shorter outer silhouette than the Inn/Hall. No baked terrain or cast shadow is included. Actual-client placement and generated runtime shadows require the integrating task's verification.
