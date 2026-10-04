# Gear badge atlas

`gear-badges.png` was generated with OpenAI's built-in image generation tool on
2026-10-04 for Emberfall. It contains no third-party source artwork. The transparent
4×4 atlas is bundled by the shared UI and numbers are rendered separately in code.

Prompt: Fantasy RPG pixel-art icon atlas on transparency, with sixteen centered
icons in an equal 4×4 grid, crisp readable silhouettes, parchment ivory and gold
with restrained colored accents, generous transparent gutters, no frames, text or
numbers. Row 1: muscular arm, double-headed range arrow, hourglass, sword. Row 2:
critical starburst, sword impact, blood drop, poison drop. Row 3: flame, roots,
paired arrows, flying arrow. Row 4: stopwatch, explosion, leaf, magic spark.

Cell keys and ordering live in `../components/EquipmentPanel.tsx`. The original
generation request also specified consistent scale and visual weight and that
every icon stay fully inside its cell for CSS background-position slicing.
