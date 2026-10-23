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

| File           | 48 px hotspot | Purpose                           |
| -------------- | ------------- | --------------------------------- |
| `default.png`  | `5 4`         | Pointing armored glove            |
| `pointer.png`  | `5 4`         | Brighter glove with ember accents |
| `attack.png`   | `3 3`         | Northwest sword for hostile hover |
| `aim.png`      | `24 24`       | Open-center targeting reticle     |
| `pressed.png`  | `5 6`         | Sword with orange impact accents  |
| `disabled.png` | `24 24`       | Red/bronze prohibition ring       |
| `grab.png`     | `24 24`       | Open armored palm                 |
| `grabbing.png` | `24 24`       | Closed armored fist               |
| `text.png`     | `24 24`       | Ivory insertion beam, bronze caps |

Each size lives in its own `32/`, `48/` or `64/` directory. Hotspots are scaled
and rounded from the coordinates above. Settings → Gameplay can disable custom
cursors or change their size; these preferences apply to the canvas and portaled UI.
