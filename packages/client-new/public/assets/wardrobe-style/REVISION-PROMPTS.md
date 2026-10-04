Generated with built-in imagegen on 2026-10-04. References for each walk were the corresponding original class sheet; the bear reference was animals.png. License and credits remain in README.md and the LPC notices.

### warrior-walk

Replacement WALK ONLY sprite sheet for the exact warrior character in reference. Preserve costume, colors, equipment and crisp warm woodland pixel art. Exact FOUR columns by FOUR rows, sixteen full-body sprites evenly spaced with transparent margins. Columns: facing DOWN front, UP back, LEFT profile, RIGHT profile. Rows temporal gait phases: 1 LEFT leg fully forward RIGHT leg fully back (wide contact pose); 2 left planted while RIGHT knee lifted forward passing below pelvis; 3 RIGHT leg fully forward LEFT leg fully back (opposite wide contact); 4 right planted while LEFT knee lifted passing. CRITICAL visible alternating anatomical legs and boots in all frames, distinct opposite contacts. Do not repeat same leading leg. Robe split exposes boots and knees. Arms counter-swing and coat hem sways. All bodies SAME HEIGHT and baseline, head centered in each cell, consistent camera. No attack or fallen poses, no labels grid floor or cast shadow. Four by four square sheet.

### ranger-walk

Replacement WALK ONLY sprite sheet for the exact ranger character in reference. Preserve costume, colors, equipment and crisp warm woodland pixel art. Exact FOUR columns by FOUR rows, sixteen full-body sprites evenly spaced with transparent margins. Columns: facing DOWN front, UP back, LEFT profile, RIGHT profile. Rows temporal gait phases: 1 LEFT leg fully forward RIGHT leg fully back (wide contact pose); 2 left planted while RIGHT knee lifted forward passing below pelvis; 3 RIGHT leg fully forward LEFT leg fully back (opposite wide contact); 4 right planted while LEFT knee lifted passing. CRITICAL visible alternating anatomical legs and boots in all frames, distinct opposite contacts. Do not repeat same leading leg. Robe split exposes boots and knees. Arms counter-swing and coat hem sways. All bodies SAME HEIGHT and baseline, head centered in each cell, consistent camera. No attack or fallen poses, no labels grid floor or cast shadow. Four by four square sheet.

### mage-walk

Replacement WALK ONLY sprite sheet for the exact mage character in reference. Preserve costume, colors, equipment and crisp warm woodland pixel art. Exact FOUR columns by FOUR rows, sixteen full-body sprites evenly spaced with transparent margins. Columns: facing DOWN front, UP back, LEFT profile, RIGHT profile. Rows temporal gait phases: 1 LEFT leg fully forward RIGHT leg fully back (wide contact pose); 2 left planted while RIGHT knee lifted forward passing below pelvis; 3 RIGHT leg fully forward LEFT leg fully back (opposite wide contact); 4 right planted while LEFT knee lifted passing. CRITICAL visible alternating anatomical legs and boots in all frames, distinct opposite contacts. Do not repeat same leading leg. Robe split exposes boots and knees. Arms counter-swing and coat hem sways. All bodies SAME HEIGHT and baseline, head centered in each cell, consistent camera. No attack or fallen poses, no labels grid floor or cast shadow. Four by four square sheet.

### druid-walk

Replacement WALK ONLY sprite sheet for the exact druid character in reference. Preserve costume, colors, equipment and crisp warm woodland pixel art. Exact FOUR columns by FOUR rows, sixteen full-body sprites evenly spaced with transparent margins. Columns: facing DOWN front, UP back, LEFT profile, RIGHT profile. Rows temporal gait phases: 1 LEFT leg fully forward RIGHT leg fully back (wide contact pose); 2 left planted while RIGHT knee lifted forward passing below pelvis; 3 RIGHT leg fully forward LEFT leg fully back (opposite wide contact); 4 right planted while LEFT knee lifted passing. CRITICAL visible alternating anatomical legs and boots in all frames, distinct opposite contacts. Do not repeat same leading leg. Robe split exposes boots and knees. Arms counter-swing and coat hem sways. All bodies SAME HEIGHT and baseline, head centered in each cell, consistent camera. No attack or fallen poses, no labels grid floor or cast shadow. Four by four square sheet.

### bear-cub

Separate juvenile brown bear, eight frames in four columns and two rows: idle, four walking poses, two paw swipes, curled/resting. Warm woodland pixel art matching animals.png; transparent alpha; no tusks; smaller in-world than the druid. The original boar remains untouched.

### terrain replacement

Three equal tiles: muted green grass, warm brown dirt, olive woodland floor. Asymmetric organic scatter, quiet areas and sparse irregular grass, stones and leaves. Low contrast warm pixel art. No mirrored quadrants, kaleidoscope, diamonds, grid, paths, objects or labels. Seamless edges requested.


### portal-stone

Single regenerated mossy stone arch referenced from effects.png. Fixed heavy gray masonry, cyan rune, dark blue magical aperture, transparent exterior, no extra objects. Runtime animates only clipped interior energy; the generated stone silhouette and shadow are constant.

### Weapon orientation review

Full-sheet regeneration candidates were inspected but rejected because they still mixed anatomical hands or duplicated profiles. The retained source artwork is corrected during one-time atlas packaging in art.ts. Front-view weapons use screen-left, rear-view weapons screen-right. Side views preserve their distinct near/far arm relationship. Corrections apply to both base poses and replacement walk sheets; the brute release and rear-facing cast exceptions are explicit. No automatic runtime actor mirroring is used.


### equipment-slots

Create ONE production-ready equipment placeholder ICON ATLAS for the wardrobe-style pixel art RPG shown in reference. Exact 3 by 3 evenly spaced grid on fully transparent background, no frames, no text, no labels, no backdrop, no cast shadows. Nine distinct centered complete objects, equal visual size with generous transparent cell padding. Row1: medieval steel helmet, chain necklace with diamond amulet, straight sword. Row2: medieval leather-and-steel torso armor, round wooden shield, pair of leather gloves. Row3: pair of leather trousers/leggings, plain thick metal finger ring (clear open hole), pair of medieval leather boots. Match the reference's crisp hand-painted pixel edges, dark outlines, warm muted bronze and stone palette. These are EMPTY EQUIPMENT SLOT hints, so use desaturated warm gray/taupe monochrome with subtle edge highlights, recognizable restrained detail, no colored gems or magical glow. Each object fills about 65 percent of its identical square cell. Perfectly regular 3 columns x 3 rows square atlas. Do not include any character, face, hand inside glove, floor, background pixels or tile borders. Runtime will reduce opacity further.

Nine alpha-preserving crops are packed into 96px slot-*.png files. Empty-slot presentation combines 0.6 image opacity with the shared panel's 0.25 placeholder opacity, for 0.15 effective opacity.



### panel-leaves

Generate a production 9-slice square UI BORDER texture for a woodland pixel-art RPG window. Use reference only for crisp pixel-art style and square frame layout. REPLACE every wooden straight plank with thin entwined brown roots and winding vines covered in small muted green leaves, plus a FEW tiny cream and pale lavender wildflowers mainly near four corners. Organic delicate frame, elegant and readable at 18px border thickness, not thick bushy foliage. Straight overall square outer layout suitable for CSS border-image nine slicing: each corner ornament completely inside outer 12% corner square; top/bottom edges horizontal, side edges vertical, consistent thickness within outermost 10% on every side. All central 76% region COMPLETELY TRANSPARENT; exterior gaps between leaves also actual transparent alpha. No opaque background, no panel fill, no lettering, no buttons, no scene, no drop shadow. Frame must reach all four canvas edges without outer margin. Desaturated moss green, sage highlights, earthy brown roots, sparse flowers. Crisp hand-painted pixel art dark outlines matching Emberfall wardrobe.

Rendered as a nine-slice border without center fill, above a 76%-opaque dark-green CSS background.

