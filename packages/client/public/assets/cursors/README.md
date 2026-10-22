# Emberfall cursors

Original cursor artwork generated for Emberfall with OpenAI's built-in image
generation tool on 2026-10-22 by the delegated GPT-6 Astra art agent. The existing
`../wardrobe-style/slot-weapon.png` was supplied as the visual style reference.
No external cursor pack was imported; existing reference-asset credits remain
with their source assets.

The generated transparent atlas was cropped, box-filtered to fit 28 × 28 pixels,
and padded to 32 × 32 RGBA PNGs using ImageMagick. The source atlas and inspection
previews are development intermediates and are not bundled. All nine final
images were inspected at native size and enlarged on a dark neutral background;
transparent gutters and the alpha channel were checked.

| File           | CSS hotspot | Purpose                                  |
| -------------- | ----------- | ---------------------------------------- |
| `default.png`  | `2 2`       | Normal ivory/gold arrow                  |
| `pointer.png`  | `2 2`       | Interactive arrow with gold hover accent |
| `attack.png`   | `2 2`       | Northwest sword for a hostile target     |
| `aim.png`      | `16 16`     | Centered four-arm targeting reticle      |
| `pressed.png`  | `2 2`       | Sword with orange impact accents         |
| `disabled.png` | `16 16`     | Muted red prohibition sign               |
| `grab.png`     | `16 16`     | Open armored gauntlet                    |
| `grabbing.png` | `16 16`     | Closed armored gauntlet                  |
| `text.png`     | `16 16`     | Ivory/gold insertion beam                |

Use native CSS cursor keywords as fallbacks. Arrow and sword hotspots share the
same upper-left anchor; reticles and symmetric interaction icons use the center.
