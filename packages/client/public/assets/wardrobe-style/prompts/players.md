# Player generation prompts

[Collection, packaging and license](../README.md). These are generation records, not gameplay requirements.

### Player stride correction

`warrior-stride.png`, `ranger-stride.png`, `mage-stride.png` and `druid-stride.png`
were generated with built-in imagegen using each approved class atlas as its
identity reference. The packager replaces only the six walking rows, retaining
idle, attack and fallen poses. Inspect all directions at `/?class-movement`.

Prompt applied per class: preserve the class design, palette, pixel outlines and
weapon hands; draw a transparent four-column (down/up/left/right), six-row walk
cycle with left contact, recoil, right passing, right contact, recoil and left
passing poses. Show distinct planted/lifted boots, knee bends and fore/aft stride,
including boots below robes. Keep the camera and scale stable, use generous
gutters, and omit text, shadows, grids and scenery. A second imagegen edit removed
the unwanted painted background while preserving the 24 poses.

Whole-frame uniqueness is insufficient: the lower-leg alpha silhouettes must
change, and the loop must be reviewed enlarged and at game size.

Color continuity is mandatory for every class generation and revision: use the
approved idle turnaround as the direction-specific palette reference. Keep
material hues, saturation, brightness, shading, highlights and outlines identical
across idle, walking, attacks and fallen poses. Do not relight or recolor motion
frames. Compare idle with all six gait phases and start/stop transitions on the
same background at game size and enlarged; reject visible tone jumps. See the
required rule in [REVISION-PROMPTS.md](../REVISION-PROMPTS.md). Packaging matches the
walking tonal distribution to idle, then maps walk RGB to the nearest standing
color for the same direction with one mapping for all six phases, preserving alpha and all
existing geometry; idle, attack and fallen pixels are untouched.

The `*-stride-revised.png` sources refine the remaining directions after visual
feedback. Packaging retains Warrior left/right and Ranger down from the earlier
stride sheets at exactly their earlier scale. Other columns use the revised
sources. The follow-up prompt requests separate boot tracks for front/back,
opposite leading/supporting legs across the half-cycles, and near/far knee
changes in profile, preserving upper bodies and weapon hands. Background removal
is a separate built-in imagegen pass. Automated silhouette/contact checks are
rejection filters, not evidence that the animation looks natural.
The profile correction explicitly requests long contact strides, a vertical
supporting leg with the other heel raised, and narrow passing poses with boots
beneath the hip. This avoids six variations of the same split-foot stance.

### warrior

Production game sprite atlas for Emberfall. Match attached approved concept art and the original wardrobe's crisp pixel art: dark brown contours, warm walnut / ochre highlights, restrained material ramps, muted colors, distinct hand-placed pixel clusters. NOT a poster, no text, no labels, no border, no grid lines, no background scenery, NO ground shadows. Genuine transparent alpha background. Each sprite is completely isolated with generous transparent padding. Consistent camera, light, scale, anatomy, costume across frames. Top-down RPG 3/4 overhead camera with visible fronts, no isometric angle. Sharp pixels without antialiasing or smooth gradients.
EXACT grid: FOUR equally sized columns by EIGHT equally sized rows, 32 sprite cells total, canvas aspect ratio 1:2, ideally 1024x2048. All cells square, equal, touching as an invisible grid, no outer margins. Character feet anchored at 85% height of EVERY cell, centered x at 50%, same scale, occupies 60% cell height and at most 80% width. Columns in EVERY row are respectively facing DOWN toward viewer, UP back to viewer, LEFT profile, RIGHT profile. Rows top to bottom: 1 idle relaxed; 2 walking left foot forward; 3 walking passing pose; 4 walking right foot forward; 5 walking passing opposite pose; 6 attack/cast windup; 7 attack/cast release; 8 dead collapsed body on ground. Use clearly different limbs between walk frames. All 32 cells populated with exactly one full body each, including back-facing attacks and four collapsed poses. Do not draw extra portraits or weapons separate from bodies. Weapons remain part of character. Preserve same face and costume.
Subject: WARRIOR from the reference, closed steel helmet with narrow black visor and central silver ridge, reddish brown neck scarf, layered steel pauldrons and plate armor, brown belt boots and gloves, short steel sword and small dark steel shield. Attack windup raises sword; release sweeps sword forward. Keep sword modest so every pose stays inside its cell.

### ranger

Production game sprite atlas for Emberfall. Match attached approved concept art and the original wardrobe's crisp pixel art: dark brown contours, warm walnut / ochre highlights, restrained material ramps, muted colors, distinct hand-placed pixel clusters. NOT a poster, no text, no labels, no border, no grid lines, no background scenery, NO ground shadows. Genuine transparent alpha background. Each sprite is completely isolated with generous transparent padding. Consistent camera, light, scale, anatomy, costume across frames. Top-down RPG 3/4 overhead camera with visible fronts, no isometric angle. Sharp pixels without antialiasing or smooth gradients.
EXACT grid: FOUR equally sized columns by EIGHT equally sized rows, 32 sprite cells total, canvas aspect ratio 1:2, ideally 1024x2048. All cells square, equal, touching as an invisible grid, no outer margins. Character feet anchored at 85% height of EVERY cell, centered x at 50%, same scale, occupies 60% cell height and at most 80% width. Columns in EVERY row are respectively facing DOWN toward viewer, UP back to viewer, LEFT profile, RIGHT profile. Rows top to bottom: 1 idle relaxed; 2 walking left foot forward; 3 walking passing pose; 4 walking right foot forward; 5 walking passing opposite pose; 6 attack/cast windup; 7 attack/cast release; 8 dead collapsed body on ground. Use clearly different limbs between walk frames. All 32 cells populated with exactly one full body each, including back-facing attacks and four collapsed poses. Do not draw extra portraits or weapons separate from bodies. Weapons remain part of character. Preserve same face and costume.
Subject: RANGER from reference, green hood with face visible, dark brown leather tunic and boots, moss green cape, brown quiver with ivory arrows, compact wooden bow. Attack windup draws bowstring and release extends bow arm. Same adult proportions as warrior, not chibi.

### mage

Production game sprite atlas for Emberfall. Match attached approved concept art and the original wardrobe's crisp pixel art: dark brown contours, warm walnut / ochre highlights, restrained material ramps, muted colors, distinct hand-placed pixel clusters. NOT a poster, no text, no labels, no border, no grid lines, no background scenery, NO ground shadows. Genuine transparent alpha background. Each sprite is completely isolated with generous transparent padding. Consistent camera, light, scale, anatomy, costume across frames. Top-down RPG 3/4 overhead camera with visible fronts, no isometric angle. Sharp pixels without antialiasing or smooth gradients.
EXACT grid: FOUR equally sized columns by EIGHT equally sized rows, 32 sprite cells total, canvas aspect ratio 1:2, ideally 1024x2048. All cells square, equal, touching as an invisible grid, no outer margins. Character feet anchored at 85% height of EVERY cell, centered x at 50%, same scale, occupies 60% cell height and at most 80% width. Columns in EVERY row are respectively facing DOWN toward viewer, UP back to viewer, LEFT profile, RIGHT profile. Rows top to bottom: 1 idle relaxed; 2 walking left foot forward; 3 walking passing pose; 4 walking right foot forward; 5 walking passing opposite pose; 6 attack/cast windup; 7 attack/cast release; 8 dead collapsed body on ground. Use clearly different limbs between walk frames. All 32 cells populated with exactly one full body each, including back-facing attacks and four collapsed poses. Do not draw extra portraits or weapons separate from bodies. Weapons remain part of character. Preserve same face and costume.
Subject: MAGE from reference, burnt orange hood and robe, dark recessed face with small visible eyes, red brown belt boots gloves, ornate short dark wooden staff topped with amber crystal. Attack windup lifts free hand, release thrusts staff and palm with small ember spark (no large effects crossing cells). Keep same stature and costume in all cells.

### druid

Production game sprite atlas for Emberfall. Match attached approved concept art and the original wardrobe's crisp pixel art: dark brown contours, warm walnut / ochre highlights, restrained material ramps, muted colors, distinct hand-placed pixel clusters. NOT a poster, no text, no labels, no border, no grid lines, no background scenery, NO ground shadows. Genuine transparent alpha background. Each sprite is completely isolated with generous transparent padding. Consistent camera, light, scale, anatomy, costume across frames. Top-down RPG 3/4 overhead camera with visible fronts, no isometric angle. Sharp pixels without antialiasing or smooth gradients.
EXACT grid: FOUR equally sized columns by EIGHT equally sized rows, 32 sprite cells total, canvas aspect ratio 1:2, ideally 1024x2048. All cells square, equal, touching as an invisible grid, no outer margins. Character feet anchored at 85% height of EVERY cell, centered x at 50%, same scale, occupies 60% cell height and at most 80% width. Columns in EVERY row are respectively facing DOWN toward viewer, UP back to viewer, LEFT profile, RIGHT profile. Rows top to bottom: 1 idle relaxed; 2 walking left foot forward; 3 walking passing pose; 4 walking right foot forward; 5 walking passing opposite pose; 6 attack/cast windup; 7 attack/cast release; 8 dead collapsed body on ground. Use clearly different limbs between walk frames. All 32 cells populated with exactly one full body each, including back-facing attacks and four collapsed poses. Do not draw extra portraits or weapons separate from bodies. Weapons remain part of character. Preserve same face and costume.
Subject: DRUID from reference, muted moss green hood and mantle with a few leaves, cream inner tunic, brown belt and boots, pale beard visible, crooked wooden staff with small leaves and green crystal. Windup raises staff; release points staff and open hand with a tiny green spark. Do not add a pet inside any cell.

### wardrobe

Production game sprite atlas for Emberfall. Match attached approved concept art and the original wardrobe's crisp pixel art: dark brown contours, warm walnut / ochre highlights, restrained material ramps, muted colors, distinct hand-placed pixel clusters. NOT a poster, no text, no labels, no border, no grid lines, no background scenery, NO ground shadows. Genuine transparent alpha background. Each sprite is completely isolated with generous transparent padding. Consistent camera, light, scale, anatomy, costume across frames. Top-down RPG 3/4 overhead camera with visible fronts, no isometric angle. Sharp pixels without antialiasing or smooth gradients.
Regenerate the WARDROBE itself as a new detailed dark walnut cabinet matching the approved environment style. Keep the recognizable two doors, scalloped carved cornice, reddish brown panel moldings, small dark steel handles and short block feet. Render four frames in EXACTLY ONE HORIZONTAL ROW of four equal square cells, canvas 2048x512 if possible. Frame 1 doors shut; frame 2 doors a quarter open; frame 3 doors halfway open; frame 4 doors fully open revealing hanging green cloak and orange robe, a shelf and boots. Same cabinet body and footprint in every frame, only doors swing. No character, no scenery, no floor, transparent background. Center in each cell, base at 90% height, cabinet height 75% cell, leave room for open doors. No labels. This is usable sprite artwork, not a mockup sheet.
