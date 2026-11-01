# Graphics acceptance and loot hints

[Back to Graphics and visual feedback](../graphics.md).

## Acceptance

Village buildings, including the wardrobe, have no world-space name labels.
The village Forest portal also has no overhead name badge; its interaction prompt,
portal window title and off-screen navigation label remain visible when applicable.

In the new client, world text, chat bubbles, portal labels and navigation
are rendered with the world. Text textures use four times the font resolution for
sharper glyphs without increasing the world render resolution; adaptive resolution
still affects the final canvas output.

- Preset/individual changes apply immediately and persist without changing collision or simulation. Red warnings and the Warrior attack zone remain visible at every preset.
- Cross world seams: fog, scenery, shadows, attachments and portals remain anchored to the world.
- Occluding scenery uses the animated player silhouette plus a 1-pixel margin as a transparent cutout; pixels outside it, health bars and shadows retain their normal appearance.
- Disable vegetation sway live and reload: roots stay fixed and the preference persists.
- Damage flashes restart on each hit, including ailments and killing blows; remote players do not receive the local sprite flash.
- Check weapon visibility, debuff spacing/expiry, torch animation, animal shadows, portal bloom-off visibility and reduced-motion countdown.

Each bundled inventory item has dedicated generated artwork; equipment-slot hints
are reserved for empty slots. Inventory, trading, storage and ground loot use the
same item artwork. Plant items retain their matching generated plant silhouettes.
Storehouse and Lodge have distinct generated building images matching the existing
buildings' front-facing camera, chunky material detail, palette and proportions;
existing NPC art is retained.

Gatherable resources retain their tree, rock, stone and plant artwork until
depleted. Stone nodes have their own live and depleted images, distinct from rocks.
Each of the five named plants has its own harvested remnant. Generated stump,
rubble and cut-stem sprites replace resources during the
one-hour restoration cooldown. Partial tree health bars remain visible at every
graphics preset; depleted resources do not receive active interaction outlines.
Live and gathered states retain their ground anchors. Sun and local-light shadows
derive from the alpha silhouette of the currently displayed state; old live-state
shadows must disappear on depletion and return with the restored resource.

Evidence: [player-cutout.spec.ts](../../../tests/player-cutout.spec.ts).

For receipt feedback and its visual evidence, see [loot hints](loot-hints.md).
