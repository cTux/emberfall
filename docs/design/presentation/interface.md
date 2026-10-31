# Application and content-driven UI

[Back to Client presentation and shared UI](../presentation.md).

## Application and component boundaries

Ability visibility lives in `emberfall-new.preferences`, independently of quality
presets. `abilityEffectOpacity` filters by owner and supplies the alpha multiplier
to both training and forest renderers. Explosions carry optional `ownerId` metadata
from the shared combat/talent producers through existing scene replication; older
ownerless visuals remain visible. Each effect multiplies its animation fade by
the selected opacity. Enemy danger rendering uses its existing independent pass.

Bundled item textures resolve through `class-art.ts`'s item lookup for both
inventory views and world loot. Plant items reuse their own generated plant
cells. Empty equipment-slot hints remain separate from item artwork.
Storehouse and Lodge load dedicated native images; their aspect-preserving world
dimensions also size their alpha masks. Resource-state sprites keep their authored
128px ground anchors through native loading. `resourceScenery` caches each kind,
variant and live/depleted state together with its shadow mask; restoration selects
the cached live state in both village and forest. NPC sprite choices are unchanged.

The host's `cursors.scss` supplies transparent PNG native cursors with explicit
hotspots and system fallbacks, including portaled UI. Preferences supply a body-level
size attribute selecting pre-sized 32/48/64 px PNGs and hotspots measured in each
final image. Fingertips and blade tips stay at the pointer position. Open and closed
drag hands use the same hotspot coordinates as the default cursor at each size,
keeping the image position stable when hovering or pressing a drag handle. Disabling
custom cursors overrides all cursor variables with their native keywords. The host
applies preferences independently of storage writes, so unavailable storage does
not prevent live changes. Shared drag handles expose
`data-drag-handle` without depending on host assets. `cursors.ts` derives combat
feedback from detached displayed poses, shared weapon/training rules and enemy
model hitboxes. Arena projects the pointer through its input camera and uses
wrapped distances for hover feedback, updating `data-cursor` only on state changes.
Pointer leave, blur and visibility changes clear hover feedback; modal and text
entry blocking applies alongside existing input suppression. Browser coverage is
in [cursor scenarios](../../../tests/cursors.spec.ts).

`interaction-targets.ts` picks opaque pixels of functional scenery and portals in
display depth order, using the same wrapped camera as rendering. It caches yellow hover and green held-Alt
one-world-unit silhouette outlines per finite sprite frame, display size and color.
Arena tracks both Alt keys and the start of a continuous hold, shows green outlines
only after more than 500 ms, prevents their browser defaults, and clears them on
blur or visibility change. Its existing interaction targets supply green outlines
in depth order while gameplay input is unblocked, without changing picking or range.
Range uses confirmed player positions and the existing entrance/NPC/portal geometry.
Arena routes in-range left clicks to Game's existing E action and suppresses combat
for clicks on functional targets. Hovered targets take priority over nearby E
fallbacks; an out-of-range hover cannot activate another nearby object. Names and
badges have no interaction-dependent styling. Browser coverage is in
[interaction outlines](../../../tests/interaction-outlines.spec.ts).

Arena draws the local player's interaction prompt after world rendering in both
areas, using the selected E action, confirmed living state and existing input
blocking. `drawInteractionPrompt` in `effects.ts` places a separate circular E
badge and short interaction name below the player's name at the displayed pose.
It shares the world camera transform, stays above scenery but beneath speech
bubbles, and exposes its current label as `data-interaction-prompt` for the
interaction browser scenarios.
The saved `hideGatheringHintInCombat` preference defaults to true. Arena suppresses
only `gather:` prompt labels during active forest scenes or active village training
inside a training zone, using confirmed state. Interaction selection and actions
are unchanged. [Gathering coverage](../../../tests/gathering.spec.ts) checks visibility,
the setting override and persistence.
The capsule uses semicircular ends; its left end shares the button's center.
Concentric 6/5-unit circles form the button rim and face inside the capsule's
8-unit radius. Native renderer gradients and separate shadows provide depth
without changing geometry or adding image assets.

[main.tsx](../../../packages/client/src/main.tsx) owns the connection, browser identity, recovery and screen composition. [Arena.tsx](../../../packages/client/src/Arena.tsx) owns input capture and animation-frame drawing. Settings, Codex, chat and performance sampling are client concerns; server actions stay in the client host.

`ChatProvider` in the client entry point keeps one chat outside account, game and lazy-loading boundaries. Account handlers, the game connection and content boundaries report private system errors there; Game supplies the filtered world conversation and send action. Local errors and newly received conversation entries share arrival order and the ten-message display limit. Joining another world replaces its conversation while retaining private errors.

`packages/ui` exports controlled components and the shared theme. It has no game-package imports, network requests, persistence, gameplay rules or authorization. [Its README](../../../packages/ui/README.md) is the canonical component API/build guide and is imported directly into Storybook by `Guide.mdx`; preserve that integration. Storybook screens are local-state examples, not another application state machine.

Use the existing theme → MUI defaults → colocated styled rules → small local `sx` hierarchy. Shared components expose typed data/callbacks, accessible labels and keyboard behavior. GameWindow supplies modal focus trapping/restoration and draggable titles; the client supplies persisted positions through context.

Game owns the F1 Codex, Escape Settings, I Inventory and N Talents shortcuts. Opening hotkeys toggle their own windows closed, while typing, modifiers, repeats and other open windows guard against unintended toggles. F1 cancels browser help before repeat handling, including while a window is open. HudActions accepts optional shortcut text for its tooltip while preserving the action's accessible name. Exit remains an explicit HUD action.

GameWindow provides a left tab rail through a private context. ChapterTabs portals its vertical tablist into that rail, outside the bordered content surface but inside the dialog focus scope and draggable frame. Untabbed windows omit the empty rail; standalone ChapterTabs uses an inline vertical layout. The rail narrows on small screens and scrolls independently of window content.

`WorldList` sends clicks anywhere in an available server row to the host's join callback. Its native name button remains the keyboard target and stops click propagation to avoid duplicate joins. Full worlds and the host's disabled state block both paths; hover and pointer styling apply only to available rows.

The action bar and wardrobe spell squares share dedicated class spell artwork (bleeding slash arc, poison arrows, twin flying fireballs, and zigzag roots); compact ailment markers retain their separate status artwork.

Wardrobe composes controlled `ClassCard` components in one four-column row inside a 600px `GameWindow`. Cards own layout and MUI tooltips; the client supplies portraits, weapon/spell descriptions, rounded class stats (level, XP, maximum HP and Power), selection state and callbacks. Only the selection button is disabled by selection, connection or countdown state. Tooltip buttons remain focusable. Window width is configurable without changing other dialogs. Matching Ninja Adventure facesets are shipped with the client and recorded in its asset notes.

PartyCard displays nickname and level within a single HP meter, without a heading. Its portrait and meter share the same theme height. Accessible host (top-right crown) and away-dimension (top-left door) icons overlay the portrait. The client supplies matching class facesets and calculates Power from each class loadout through characterStats.

An optional controlled companion view adds a shorter, narrower HP row beneath the player inside PartyCard. The client supplies the companion name, confirmed health and portrait from their existing companion sprite art. StatusMeter retains accessible health values at the compact size; no companion state or gameplay rules live in the UI package.

## Content-driven views

`TalentIcon` uses measured pixel boundaries for the uneven five-by-six class
atlases, shared by the talent tree and action bar. `TalentTree` receives the
catalog's optional `kind` and outlines active icons in `info.main`; rank borders
and passive styling remain independent of this marker. Unlearned cards use a
transparent border to preserve their size when learned; only learned cards show
the primary border color. Keyboard focus keeps its separate outline.

Available classes, equipment slots and extra numeric stat rows derive from the
initialized core catalog. Classes and enemies declare existing art families;
equipment slots declare their labels and grid positions. Pure client content
view helpers build slot/stat views; EquipmentPanel grows beyond its minimum
three-column/four-row grid when supplied slots require it. Class descriptions
use registered `details` or generic fallbacks. Ability descriptions
resolve supported mechanic kinds independently of definition IDs. Controlled UI
receives view data and has no game-package dependency. See the
[mod design](../mods/consumers.md#make-registry-data-drive-gameplay).
