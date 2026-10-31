# Wardrobe-style artwork

[Back to Graphics and visual feedback](../graphics.md).

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
