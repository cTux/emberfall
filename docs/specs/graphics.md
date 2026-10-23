# Graphics and visual feedback

Status: implemented visual baseline. Goal: a readable pixel-art world. The client uses native PixiJS WebGL. See the [presentation design](../design/presentation.md) and [new runtime design](../design/new-runtime.md).

## GRAPHICS-01 — Presets and renderer

Settings contains Low, Balanced and High (default) presets, plus persistent individual toggles. High enables soft projected tree shadows, 2D contact ambient occlusion, dense grass clusters, sprite-only motion blur, flickering campfire/player lighting, bloom, and ambient particles. Resolution options are 75%, native and 150% supersampling, with backing pixel density capped at 3x. Changes apply immediately and do not change server simulation or collision geometry.

**Smooth textures** enables linear texture filtering in both areas and is enabled
in every preset. Disabling it restores nearest-neighbor pixel edges immediately;
the choice persists across reloads. World text keeps its existing sharp sampling.
Entity artwork uses gentler, material-colored dark tones and slightly reduced
contrast, preserving transparency, frame bounds and gameplay warning colors.

Settings include sunlight shafts, soft-light color grading, adaptive resolution and frame caps (display refresh, 30/60/120/144 FPS). Adaptive resolution adjusts the selected render scale between 50% and 100% every two seconds based on frame time; it never changes world size, input cadence or collision geometry. Low/Balanced enable adaptation; High prioritizes fixed resolution. Red gameplay warnings remain enabled at every preset. Native DLSS, frame generation, hardware ray tracing, depth-buffer SSAO and HDR output are not advertised as supported. PixiJS does not introduce those native rendering features.

High defaults to 150% supersampling and display-refresh frame pacing. Low uses native scale with adaptive resolution; Balanced uses native scale with adaptation, shadows, contact occlusion, dynamic lighting, vignette, color grading, particles and vegetation sway. Preferences can be adjusted individually.

## GRAPHICS-02 — Village lighting

A distant sun at (-6000, -8000), elevation 10000, produces parallel projected silhouette shadows throughout the village. Tall path lamps use a bronze post and orange lantern from [Karsiori's FREE Pixel Art Lantern Pack](https://karsiori.itch.io/free-pixel-art-lantern-pack), under CC0. The unmodified PNGs are combined and scaled at runtime using the lantern's original 38-frame fire animation with rising orange, red and gold portal-style embers (Ambient particles controls embers; Bloom controls their glow); credits and the original readme are in `public/assets/lanterns`. They retain the torch positions and 20x60 world dimensions and cast warm light with weak, radius-limited occlusion (145 world units); every player emits warm light with a moving 110-unit radius, without a visible belt lantern. Local shadows project away from their emitter, weaken with distance and disappear outside its radius. Trees, buildings, grass, torch posts and character sprites participate. A player light does not shadow its own character. Sunlight is directional 2D projection, not a 3D renderer.

Static sun shadows and static torch occlusion are cached; dynamic character blockers and player lights update as players move. Light scratch canvases are reused. Existing Soft shadows, Dynamic lighting and Bloom settings control these passes. Disabling effects never changes collision geometry. The sun stays offscreen; no sun decoration obscures the playable map.

## GRAPHICS-03 — Scenery and atmosphere

Fog is animated, seamlessly tiled and layered; it is disabled by default in every preset and can be enabled individually. Saved individual fog preferences remain in effect on reload. Fog and flying particles use world coordinates with seamless repetition. Dense grass, paths and scenery share depth ordering with actors. The renderer draws baked fog sources with native Pixi sprites.

Scenery covering the local player's sprite fades to 20% opacity (80% transparent) when the player is behind it, then returns to full opacity once the player moves clear or in front. This applies to village trees, buildings, wardrobe and torch posts, and forest trees. Players can walk through all scenery; shadows remain unchanged. In the new runtime, training dummies, enemies, other players, companions and decorative animals share this foot-position depth ordering and fade when covering the local player. Player ground identification rings are not drawn; sprite sizes stay unchanged.

Settings → Graphics includes **Waving grass and trees**, independent of grass density. Enabled by default and in Balanced/High, disabled in Low; the choice persists across reloads. Both areas use gentle, staggered foliage sway with fixed roots. Disabling it immediately restores static sprites. Sprite drawing applies a time-based horizontal shear without changing collisions, sorting, tree fading, or cached shadows; each renderer implements the same transform. Browser checks cover movement in both areas, fixed roots, live toggling, presets, and persistence.

Decorative cats and chickens wander in the village; raccoons appear in the forest. They are deterministic client visuals, participate in shadow passes and do not affect combat, collision, loot or party scaling.

## GRAPHICS-04 — Combat readability

In the new client, all player projectiles (arrows, fireballs and Druid roots) have
a thin, one-world-unit light-green silhouette outline in training and forest,
at every graphics preset. Their class art, size, animation and flight remain intact.

Active debuffs appear as 12-unit framed icons with a 2-unit gap, aligned to the left edge above the health/name area, with only outlined stack counts in their lower-right corners. Roots use the same row and outlined stack style. Silence uses the same row without a stack count; it is a non-stacking status. The shared renderer accepts timed ailments and indefinite statuses; Silence uses a bronze-framed crossed speech icon suitable for future player debuffs. Expired effects disappear and an empty row takes no space. Weapons appear on living characters and animate with their existing attacks; outside combat, upward-facing characters carry their class weapon across their back, including when they stop after walking up. Other non-combat directions keep weapons hidden. Wardrobe choices show weapon and ability icons. Combat rules and network state are unchanged. Existing browser coverage checks all class assets, icon placement, expiry and stacks, plus back-weapon visibility for all four classes and movement directions.

Portal voting lives inside the draggable portal window, with a compact control to reopen it. Prompts project each source's world coordinates through the camera, rather than sitting at the screen edge. Village and return portals have an animated blue pixel-ripple interior, a pale blue rim, and outward-drifting square motes. Bloom adds a soft blue glow; the surface remains visible with bloom disabled. Portal bodies and their fading blue motes draw before characters. At scene completion each player's nearby portal stays fixed where it spawned.

Damaged enemies (including elites, bosses, and training dummies), companions, and the local player briefly show a red sprite outline and white tint, fading over 220 ms. Killing blows flash during the enemy death animation. Other players do not receive this sprite effect. Each new hit restarts the flash, including damage over time. Local damage also flashes the screen red. A persistent Vignette toggle controls edge darkening in both village and forest. Fog and flying ambient particles use world coordinates and seamless world-sized repetition; camera movement only changes which portion is visible.

Diagonal facing retains its current valid axis near a 45-degree heading to prevent sprite flicker. Player sword reach is 88 units. Neither client draws a green attack-range circle or forward semicircle on the ground at any graphics preset. The sword visual and server hit distance share the same range constant. Damage remains 5 per swing.

Blood puddles have their own persistent gameplay toggle. Damage numbers and hit effects present server events; they cannot award damage or XP.

Dropped equipment and consumables have a short, pale-gold vertical beam behind
their icons, fading upward from the ground. The marker stays visible at every
graphics preset until collection or expiry and follows wrapped pickup positions.

In the new runtime, floating damage numbers combine hits from the same player to
the same target with the same damage type within 10 ms of the first hit (inclusive),
using server event timestamps. Each total keeps the first hit's position and
lifetime, sums exact amounts before rounding, and uses critical styling if any hit
was critical. Later hits start a new total; hits without player attribution remain
separate. This applies in training and forest and does not alter damage or DPS.

Floating battle text pops on impact, settles, then drifts upward and outward in
stable lanes so successive hits do not all cover one another. Normal numbers keep
their damage-type color; incoming damage stays red. Critical hits use larger
white numbers with a red outline. Every number has a dark readability outline,
holds full opacity initially, and fades completely by 750 ms, within the server's
800 ms event retention. The existing Floating damage numbers toggle controls the
effect in both areas, independently of graphics preset.

## GRAPHICS-05 — Wardrobe-style art in the new client

The new client uses a cohesive pixel-art set
based on the approved wardrobe-style concepts, including a newly drawn wardrobe.
Village chickens panic when a living player comes within 70 world units, run in the opposite direction at increased speed with faster walking animation until 100 units clear, then return to wandering. This decorative response respects world wrapping and does not affect collision or combat.
Players, enemies and animals have frame-based locomotion; combatants also have
attack/cast and fallen poses. Idle motion, damage flashes and death transitions
remain presentation-only. Scenery, weapons, portraits and effects use the same
palette and outline treatment. The lobby village scatters mossy rocks and five distinct
plant kinds (ferns, berry bushes, meadow grass, violet wildflowers and flowering herbs)
using fixed seeds and the same path, building and training-clearing exclusions as trees.
They share scenery depth ordering, player-overlap fading and lighting; plants also use
the Waving trees setting. Forest scenery remains unchanged. The obsolete Dense grass clusters
setting is removed, and the foliage setting is named Waving trees; old saved grass
preferences are ignored.
Buildings and ground stay fixed; lobby chimneys
emit subtle drifting smoke when Ambient particles is enabled.

This replaces the original-runtime source art and frame counts described above.
New-client weapons are part of the character frames, including idle poses; they
are not drawn a second time as attachments. Weapons stay in the character's
anatomical right hand across facing and action changes; shields stay left.
Lanterns use four painted frames. Portals use a single regenerated stone arch:
only the energy inside its aperture moves. Idle breathing, damage flashes and death fades remain
procedural. All four player classes use six distinct walking poses per direction,
with consistent weapon hands across idle, walking, attack and fallen poses.
Each class keeps the same material colors, saturation, brightness and shading
across idle and motion; starting or stopping must not visibly recolor the character.
Player frames have transparent gutters and a stable scale and foot anchor;
heads and weapons must stay entirely within their own frame.
Runner and caster still reuse one of three poses. Druid standing/walking body
height matches the other classes instead of being scaled down by its raised staff.
The companion uses a juvenile bear smaller than the druid; the boar remains in
the asset collection and gallery. Belt lanterns use the generated flame frames.
Ground tiles preserve asymmetric source scatter rather than mirrored quadrants.
Opposite ground-tile edges blend continuously in both axes, including corners;
dirt paths feather into the surrounding grass without a hard cutout.
The wardrobe opens while its interaction is available nearby.
Window frames use intertwined roots, leaves and sparse small flowers. Their
black panel backgrounds are 76% opaque, with text and controls fully opaque.
The decorative frame overlaps the panel edge without a transparent gutter.
Path lanterns use one painted lantern suspended from a fixed wooden post. The
lantern gently sways around its hook, with subtle flame flicker; no second lamp
is overlaid on the scenery. Ambient particles controls its small rising embers.
`/?art-gallery` previews the same packaged frames and provides action, direction,
pause and background controls. Raw sheets and prompts remain with the assets.
`/?class-movement` shows all four classes walking in all four directions at once,
with travel, pause, speed and frame controls. Walking must visibly alternate
planted and lifted feet, including beneath robes. Torso changes alone do not count.

Animation selection follows the existing movement and confirmed/predicted action
timestamps, never changes simulation timing, and uses the same frame for sprite
and shadow/hit masks. Direction changes must not crop sprites or expose another
atlas cell. Preserve retained original assets and their credits.

## Acceptance

Village buildings, including the wardrobe, have no world-space name labels.

In the new client, world text, chat bubbles, portal labels and navigation
are rendered with the world. Text textures use four times the font resolution for
sharper glyphs without increasing the world render resolution; adaptive resolution
still affects the final canvas output.

- Preset/individual changes apply immediately and persist without changing collision or simulation. Red warnings and the Warrior attack zone remain visible at every preset.
- Cross world seams: fog, scenery, shadows, attachments and portals remain anchored to the world.
- Occluding scenery fades to 20% for the local character, then restores opacity; shadows retain their normal appearance.
- Disable vegetation sway live and reload: roots stay fixed and the preference persists.
- Damage flashes restart on each hit, including ailments and killing blows; remote players do not receive the local sprite flash.
- Check weapon visibility, debuff spacing/expiry, torch animation, animal shadows, portal bloom-off visibility and reduced-motion countdown.

Evidence: [tree-opacity.test.ts](../../packages/server/src/tree-opacity.test.ts).

Gatherable resources retain their existing tree, rock and plant artwork until
depleted. Generated stump, rubble and cut-stem sprites replace them during the
one-hour restoration cooldown. Partial tree health bars remain visible at every
graphics preset; depleted resources do not receive active interaction outlines.
