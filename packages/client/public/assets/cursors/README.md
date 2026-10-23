# Emberfall cursors

Nine original WoW-inspired fantasy cursor designs were generated for Emberfall
with OpenAI's built-in image generation tool on 2026-10-23. The existing
`../wardrobe-style/slot-weapon.png` supplied Emberfall's visual reference.
No external cursor pack or Blizzard artwork was imported. The designs use ivory
armored gloves, aged bronze cuffs, charcoal outlines and ember-orange jewels.

The generation prompt requested a transparent 3 × 3 atlas in this order:
pointing glove, brighter hover glove, northwest broadsword; open-center bronze
reticle, impact sword, prohibition ring; open palm, closed fist, insertion I-beam.
It specified bold readable silhouettes, consistent hand-painted pixel-art shading,
transparent gutters and no labels or backgrounds.

ImageMagick cropped each isolated icon, trimmed transparent borders, box-filtered
it to fit within a two-pixel gutter and padded it to 32, 48 and 64 px RGBA PNGs.
Only these runtime variants are shipped; the source atlas and inspection previews
are development intermediates. All sizes share the same design and use native
CSS cursor keywords as fallbacks. The 48 px set is the default.

Hotspots are measured in each final PNG, rather than scaled from the 48 px set.
The icons were fitted independently, so scaling also scales the wrong transparent
padding. Pointing states anchor the fingertip, sword states the blade tip, and
both drag states the palm center. Reticles, disabled rings and text use their center.

| File           | 32 px hotspot | 48 px hotspot | 64 px hotspot | Purpose                           |
| -------------- | ------------- | ------------- | ------------- | --------------------------------- |
| `default.png`  | `5 3`         | `7 3`         | `10 3`        | Pointing armored glove            |
| `pointer.png`  | `5 3`         | `7 3`         | `9 3`         | Brighter glove with ember accents |
| `attack.png`   | `3 3`         | `4 3`         | `5 3`         | Northwest sword for hostile hover |
| `aim.png`      | `16 16`       | `24 24`       | `32 32`       | Open-center targeting reticle     |
| `pressed.png`  | `4 4`         | `5 5`         | `6 5`         | Sword with orange impact accents  |
| `disabled.png` | `16 16`       | `24 24`       | `32 32`       | Red/bronze prohibition ring       |
| `grab.png`     | `16 17`       | `24 26`       | `33 35`       | Open armored palm                 |
| `grabbing.png` | `13 14`       | `20 21`       | `27 28`       | Closed armored fist               |
| `text.png`     | `16 16`       | `24 24`       | `32 32`       | Ivory insertion beam, bronze caps |

Each size lives in its own `32/`, `48/` or `64/` directory. Settings → Gameplay can disable custom
cursors or change their size; these preferences apply to the canvas and portaled UI.
