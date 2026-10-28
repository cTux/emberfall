# Talent artwork

Generated on 2026-10-28 by a GPT-6 Astra art agent with the built-in OpenAI
image generation tool. Exact final prompts are in `prompts.json`. No CLI/API
fallback, external stock art, or generated text was used.

## Runtime layout

`{warrior,ranger,mage,druid}-icons.png` are native 1145 x 1374 PNGs: five
columns and six rows with uneven authored frame boundaries. The measured
pixel boundaries in `src/talent-icons.tsx` crop each complete frame; do not
divide these sheets into equal 229 x 229 cells. Read row-major with
`index = talentColumn * 10 + talentRow`; the 30 motifs per class follow
`TALENT_NAMES` in `packages/core/src/talent-catalog.ts`. These are opaque UI
tiles with their own dark backgrounds and bronze frames.

`cast-effects.png` is a transparent 1024 x 3072 atlas with four columns and
twelve rows of 256 x 256 cells. Classes are warrior, ranger, mage, druid;
each class has its three branch effects in catalog order. Thus
`effectRow = classIndex * 3 + talentColumn`. Columns are anticipation,
build, peak, and dissipation. These are one-shot clips, not idle loops.
Use a centered anchor and end the clip after the fourth frame. The shared
branch effect may be reused by all active talents in that branch.

The effect sheet is mechanically packaged from four generated 4 x 3 source
sheets. Source row bands were visually checked before extracting alpha bounds;
each branch uses one scale across its four frames, so the build-up remains
visible. Nearest-neighbor sampling preserves pixel clusters. Maximum painted
extent is 208 pixels, leaving at least 23 fully transparent pixels on every
edge. Source and destination rectangles are recorded in `effect-frames.json`.
No new effect pixels were drawn by a script.

## References and provenance

Icons use the existing `../talent-icons.png` as a style reference. That asset
was generated for Emberfall with OpenAI image generation; its original prompt
and provenance remain in `../talent-icons.md`.

Effects use `../wardrobe-style/effects.png` as a style reference. This follows
the wardrobe collection's CC BY-SA 3.0 distribution. Preserve the original
LPC source notices in `../wardrobe-style/LPC-CREDITS.txt`, `../LPC-README.md`,
and `../LPC-LICENSE.txt`, and the reference description in
`../wardrobe-style/README.md`.

Selected built-in output files under generation session
`01a18370-93bd-7053-9d3d-eeb38d188bbe`:

| Class   | Icon source                                     | Effect source                                   |
| ------- | ----------------------------------------------- | ----------------------------------------------- |
| Warrior | `exec-098b7683-d73e-4f0e-989d-32c1efbf9a3a.png` | `exec-2c3c275e-8f63-4630-8d4c-7f1a69458eb8.png` |
| Ranger  | `exec-746dd969-a1ac-469b-a04d-ff9160393e6c.png` | `exec-42fd9350-51f8-47a6-897f-283665cd5257.png` |
| Mage    | `exec-cb621ced-bfb1-4ae5-81e3-cfbac5cc9ab0.png` | `exec-9b2c5f27-54f2-4845-a310-5706d9832bb2.png` |
| Druid   | `exec-104161f2-5910-42b8-8bf6-6eaa8d422711.png` | `exec-6e1e0182-60ad-441e-9ca9-fed2b942dcfb.png` |

## Verification

The final class atlases and packaged effect sheet were visually inspected.
Pixel checks verify the dimensions, 120 nonempty unique icon cells, 48
nonempty unique effect frames, and transparent gutters around every effect.
The source sheets visibly change silhouette from anticipation through
dissipation. Actual client timing, cast positioning, and small-size readability
remain integration checks; static atlas inspection is not runtime approval.
