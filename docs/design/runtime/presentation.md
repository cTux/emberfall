# Runtime artwork and effect alignment

[Back to Game runtime](../new-runtime.md).

## Wardrobe-style presentation assets

The new client owns a separate `public/assets/wardrobe-style` collection, leaving
the original imported files and upstream notices intact. Enemy sheets use four
direction columns (down, up, left, right) and eight action rows (idle, four walk
frames, windup, release, fallen). The presentation loader normalizes transparent
cell bounds to a stable foot anchor once per source; rendering and silhouette
masks consume those same cached frames. Shadow projection pivots at the mask's
visible bottom edge, excluding atlas
padding. The normalized contact inset is measured once when the mask is created.
Action selection uses existing timestamps
and health, with no new simulation or network fields. World sheets and effects
are cached as small frame canvases, rendered as native Pixi sprites.

The animation gallery provides an inspectable frame/direction preview; actual
village, training and forest browser checks remain necessary for acceptance.

Player atlases are packaged offline into 64px cells with transparent gutters.
Rows 0–7 retain idle, four walk poses, windup, release and fallen; rows 8–9
add two walk poses. The six-pose cycle uses rows 1, 2, 3, 4, 8, 9.
Walk-only sheets replace those six rows during packaging, preserving other poses.
Packaging matches the walking color distribution to idle, then maps RGB colors
to the same direction's standing palette with one mapping for the whole cycle,
leaving alpha, silhouettes, scale, anchors and non-walk pixels unchanged. This
prevents independently generated walk sheets from changing material tones.
Direction-specific revisions retain accepted source columns with their original
normalization, so changing another direction cannot rescale approved animation.
The class-movement page shares the game's atlas loader and gait selector, showing
every class/direction enlarged and at game size. Verify lower-leg silhouettes,
not just whole-frame uniqueness, and visually inspect the loop at game size.
The player loader reads these atlases directly without runtime cropping or flips.
Packaging measures isolated alpha components instead of slicing a guessed grid;
supplemental sheets are normalized to the class scale. Left-facing staff casts retain
a safe far-hand pose, avoiding source poses that switch to the near hand.
The generated cub uses a 4×2 atlas;
the original animal sheet retains the boar. Terrain is sampled without reflection.
Silhouette caches use image identity and compact frame coordinates; never use the
base64 image source as a per-frame key. Idle breathing does not continuously
invalidate the light occlusion canvas.

Enemy source-specific orientation corrections remain in the legacy loader.
Player direction and handedness are authored in the source sheets.
Anatomical right is screen-left in a front view and screen-right in a rear view;
profile weapons must keep their near/far arm relationship. Do not automatically
mirror one valid profile into the opposite direction.

The portal's single `portal-stone` texture and shadow mask never change frames.
Three cached energy sprites animate inside an aperture clip. Chimney anchors
belong to the building's projected position; five cached, low-opacity smoke
sprites drift above each visible chimney when Ambient particles is enabled.
Neither effect allocates textures or uploads a new canvas per frame. The gallery
uses the same drawing functions; its browser test checks static portal stone,
changing interior pixels and moving smoke.

## Local effect alignment

The shared training/forest projectile renderer bakes a light-green silhouette
outline once per projectile art frame at its displayed size. It reuses the hit
outline helper with a one-unit radius, draws the original art over it and caches
the ten frames. Procedural fallbacks retain the same outline before art is ready.

Movement's elapsed-time accumulator is monotonic across input handlers and RAF
callbacks: a frame timestamp may predate `performance.now()` observed by an input
event. Rewinding the accumulator double-counts time and grows the input backlog.

Confirmed local projectiles adopt the wrapped difference between the reconciled
player and the latest authoritative player once. Their flight distance, heading,
remaining range and confirmed ID survive adoption; confirmation does not restart
flight or duplicate sibling shots. Existing projectiles do not follow subsequent
player movement. Other players retain buffered interpolation.

The server publishes each attracted drop's `collectorId`. After interpolation,
`pickup-presentation.ts` blends the local recipient's render offset into that
drop, reaching the full offset at collection distance. Only detached coordinates
change: the server still selects the recipient, removes drops and awards XP.
Unclaimed and remote-targeted drops are unchanged. Tests cover protocol projection,
delays, world seams, source immutability and duplicate adoption.

## Loot hint receipts

Loot hints observe detached, authoritative local backpack totals in `Arena.tsx`.
The initial snapshot seeds a silent baseline; later positive item quantity deltas
create local presentation entries. This also covers gathering, trading and storage
receipts. Decreases and inventory rearrangement produce no hints. Entries use
monotonic client time, follow the reconciled local player in both scenes, and
expire after 2100 ms. The local preference clears entries while disabled and
continues updating the baseline to prevent replay. No save or wire schema changes
are required. Rendering reuses bundled item/plant art through native Pixi commands.

See [loot hint behavior and visual evidence](../../specs/graphics/loot-hints.md).
