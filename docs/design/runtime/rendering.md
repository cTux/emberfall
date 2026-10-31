# Native Pixi rendering and diagnostics

[Runtime design](../new-runtime.md).

The client Miniplex world tracks presentation entities, including reconciled local
poses and confirmed remote actors. The renderer pools native Pixi sprites, text,
geometry and mask groups. Source textures, mutable crop frames and normalized
gradient ramps are reused. Small particle glows are baked once; moving lights
have separate revisioned sources. The visible world is WebGL, not a Canvas frame
uploaded to one sprite. Existing drawing helpers use a command adapter to preserve
their visual rules while emitting native Pixi objects.

The display list retains unchanged child order between frames and removes unused
tails, including clipped groups. Color parsing is bounded and reused; ordinary
axis-aligned sprite transforms avoid matrix decomposition. Light textures update
only when a nearby blocker, its silhouette, the source light or shadow settings
change. Camera translation and flicker alone do not upload a new texture.
Village building and wardrobe sprites omit name badges. World text, chat bubbles,
portal labels and navigation stay in the Pixi render pass. Pooled text uses cached
textures rasterized at four times the font
resolution, with linear sampling to preserve strokes at fractional zoom in labels and
damage numbers. Text density does not increase the world render resolution.

The host loads the validated font preference before account/game composition and
passes it to `GameUiProvider`. The provider loads regular, medium, bold and italic
faces before applying the family, preventing fallback glyphs from entering Pixi's
text cache. Arena shares the applied theme family with Pixi text and measurements;
debug monospace labels remain monospace. Canvas CSS uses smooth resampling even
when sprite textures use nearest sampling. The existing preference storage owns
the font choice; shared UI owns no storage.

The optional hitbox overlay runs after world effects in both village and forest.
`client/hitboxes.ts` reads detached displayed poses and common collision,
enemy, world, attack and pickup definitions. Body, feet, projectile and scenery
shapes have distinct colors; orange labeled rings indicate action ranges rather
than solid bodies. The preference defaults to false, lives in `emberfall-new.preferences`,
and does not change server rules or client prediction. Player movement passes
through scenery; its feet circle is labeled as pass-through. Bear/enemy feet shapes
represent their scenery collision checks. Player projectile-target bodies use the
combined incoming-projectile hit threshold minus the incoming projectile radius,
so the displayed circle sum reproduces the actual hit check independently of the
player movement radius.
`data-debug-hitboxes` reports the number of visible shapes for rendering diagnostics.
Verification: [hitbox overlay tests](../../../tests/hitboxes.spec.ts).

Gradient ramps are baked once onto transparent textures and cached independently
of world position, so vignette centers preserve the scene beneath them. SVG
status assets are rasterized once at their decoded dimensions before GPU upload.
The WebGL back buffer is enabled for soft-light color grading to blend with the
scene instead of falling back to a plain translucent fill.
Its blend filter unpremultiplies texture colors before applying the Canvas
soft-light equation, then composites alpha once.
The renderer pixel tests compare gradient blending with Canvas and check all five
debuff glyphs, including reuse of pooled sprites.
