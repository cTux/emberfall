# Emberfall favicons

Original flame artwork generated with OpenAI imagegen on 2026-10-23 for
Emberfall. The forest-green outline is intended for light browser tabs; the
parchment-gold outline is intended for dark tabs. Both retain transparent
backgrounds and the game's orange, gold and parchment palette.

Each theme contains square PNG exports at 16, 32, 48, 64, 180, 192 and 512 pixels,
plus a multi-resolution ICO containing 16, 32 and 48 pixel frames. The client
head selects tab PNGs with `prefers-color-scheme`. `/favicon.ico` is the light
variant fallback for browsers without media support and direct favicon requests.
The 180 pixel light export is also the Apple touch icon; home-screen icons do
not switch with the browser theme.

The two 1254 pixel generated originals were mechanically resized with
ImageMagick's default resize filter and stripped of metadata. The committed
512 pixel PNGs are the largest distributed exports. No third-party artwork
was used.

Generation brief: a single bold flame emblem with three outer lobes, a burnt
orange body, golden inner flame and pale parchment core, without text or
decoration, legible at favicon sizes. The dark variant preserves the same mark
with a brighter outer outline for contrast against dark tabs.
