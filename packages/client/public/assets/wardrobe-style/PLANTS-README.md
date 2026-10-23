# Village plants

`plants.png` contains five original plant sprites generated with OpenAI imagegen
on 2026-10-23 for the lobby village: fern, berry bush, meadow grass, violet
wildflowers and flowering herb, from left to right. The generated transparent
source is preserved. No external artwork was composited. This collection's
CC BY-SA 3.0 distribution and retained LPC notices in [README.md](README.md) apply.
Rocks reuse the existing mossy rock cell in `environment.png`.

Runtime packaging measures alpha bounds within source columns
`[0, 440, 845, 1230, 1615, 2048]`, scaled to the source width, then uses
nearest-neighbor sampling to place each silhouette in its own bottom-anchored
64px cell. The five silhouettes share one atlas and five reusable masks.

Prompt: Five distinct isolated plants in one horizontal row: leafy fern with
arching divided fronds; dense wild berry bush with crimson berries; tall
golden-green meadow grasses; violet wildflowers; broad-leaved herb with ivory
blossoms. Top-down RPG three-quarter overhead camera. Muted moss and olive greens,
dark brown contours, ochre highlights, restrained pixel-art ramps and crisp chunky
clusters. Transparent background, no ground, shadows, labels, borders or pots.
