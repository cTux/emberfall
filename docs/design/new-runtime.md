# Independent game runtime

Status: implemented independent runtime. Existing gameplay specifications remain
the behavior contract. Existing packages remain runnable and are the parity
reference, not dependencies of the new runtime. See the
[verification record](../plans/new-runtime.md) for measured coverage and limits.

## Ownership

- `common-new`: serializable definitions, validated commands, geometry, shared
  simulation and prediction functions. No DOM, database or network connections.
- `server-new`: authoritative Miniplex entities, ordered fixed-timestep systems,
  Colyseus transport/state projection and Colyseus database persistence.
- `client-new`: Colyseus SDK, presentation/prediction Miniplex world, PixiJS world
  rendering, audio and screen composition using the shared UI package.
- `ui`: shared controlled components and theme for both runtimes.

Definition objects describe types; mutable entities describe instances. Stable
definition IDs connect them. The simulation owns live state; network projections
and render objects never write damage, rewards or saved progress back into it.

Training definitions keep the 270-unit combat radius separate from the 135-unit
vegetation clearing radius, preserving seeded tree placement. The client renders
dummies without a zone fill or outline; shared wrapped geometry still gates attacks.

Village dummies join the same foot-position render sort as scenery and actors. Actor bodies use the scenery overlap test against the reconciled local player, fading to 20% while in front; health bars keep full opacity. Shared player definitions own the reduced body and incoming-projectile hit radii.

## Simulation and replication

The shared village definition owns Marta the Innkeeper's fixed position and
display name. `nearbyInteraction` excludes the Inn doorway and selects Marta
using the existing wrapped proximity check. The client reuses the building
placeholder window and scenery depth ordering. Marta and player health labels
share `drawCharacterName`; Marta's label sits above her sprite and adds the
interaction background and `(E)` only while selected. Her cached idle frames advance
by time, with the same frame used for rendering and shadow masks; there is no
moving NPC state, network command or persistence change. Verification:
[village rules](../../packages/server-new/src/village.test.ts) and
[Innkeeper browser scenario](../../tests-new/innkeeper.spec.ts).

Gold collection adds one coin to the nearest living forest collector, once, in shared simulation. The optional validated `coins` progress field defaults to zero when loading old saves. Existing per-class save scheduling and protocol payloads carry the balance; the shared party card receives confirmed values from the new client.

Each party has one Miniplex simulation world. Components reference canonical
plain entities; ordered query views preserve targeting and spawn order even when
Miniplex removes an item by swapping it with the last item. Shared kernels consume
those views in both forest and training. Replacing a scene removes its components
and queries. Systems run on a fixed 50 ms tick; queued input cannot consume more
than that tick's movement budget.

Each connection has a private Colyseus session room. The shared party registry
owns gameplay, so browsing, password joins and world transfers preserve one SDK
connection and existing recovery behavior. This is intentionally a single-process
design, not a horizontally sharded room-per-world deployment.

`common-new/protocol` projects plain state into native Colyseus schema records.
Positions, angles and input acknowledgements use scalar deltas; the remaining
entity details use a per-entity payload. Collection membership and order are
explicit. A party broadcast is serialized once and applied to each session's
projection. The client reconstructs detached snapshots so later patches cannot
mutate interpolation history. Protocol versions are checked at room creation.

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
World text, chat bubbles, building/portal labels and navigation stay in the Pixi
render pass. Pooled text uses cached textures rasterized at four times the font
resolution, with nearest-neighbor sampling for sharper enlarged labels and
damage numbers. Text density does not increase the world render resolution.

The optional hitbox overlay runs after world effects in both village and forest.
`client-new/hitboxes.ts` reads detached displayed poses and common-new collision,
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
Verification: [hitbox overlay tests](../../tests-new/hitboxes.spec.ts).

Gradient ramps are baked once onto transparent textures and cached independently
of world position, so vignette centers preserve the scene beneath them. SVG
status assets are rasterized once at their decoded dimensions before GPU upload.
The WebGL back buffer is enabled for soft-light color grading to blend with the
scene instead of falling back to a plain translucent fill.
Its blend filter unpremultiplies texture colors before applying the Canvas
soft-light equation, then composites alpha once.
The renderer pixel tests compare gradient blending with Canvas and check all four
debuff glyphs, including reuse of pooled sprites.

## Compatibility

The new packages cannot import old common/client/server packages. Assets and rules
are ported with attribution; parity tooling may read the old implementation.
Dedicated commands, ports, database paths and browser identity keys isolate the
two runtimes. New commands include dev-new, build-new, start-new, test-new,
typecheck-new and test:browser-new.

Keep 20 Hz simulation, current numbers, wrapped maps, all classes, companions,
training, encounters, graphics preferences, UI, audio and recovery behavior.
Prediction covers movement, aiming and local cast presentation. Camera, shadows,
attachments and sound follow reconciled presentation. Replayed inputs must not
repeat sounds or effects. Server confirmation owns hits, deaths and pickups.
Automatic attack prediction starts from the first confirmed server attack time;
entering training or a forest never invents an initial swing from a snapshot's
timestamp. Established cycles still extrapolate between replies, and manual casts
retain their immediate request-based prediction.
Each confirmed local projectile keeps its server identity and its original visual
heading, even after a sibling projectile disappears. A snapshot timestamp alone
does not reject a future automatic cast before the server's attack phase reaches
it. Shots first discovered after the server launch retain their authoritative
in-flight position and remaining distance instead of restarting at the player.
Confirmed completion, rejection, death, transfers and stale-state limits still
retire visuals; these corrections do not change server damage or projectile range.
Buffered enemy positions cannot retire a local projectile through a speculative
impact; only its visual range limit or authoritative completion ends its flight.

## Persistence

The executable now uses [Steam accounts](steam-accounts.md) for character ownership
and nickname onboarding/editing. Existing browser saves remain intact; Steam
accounts start fresh. Browser-token authentication remains only in isolated parity
fixtures. Sessions, account tables and public-origin configuration are described
in the account design and [operations](../operations.md#steam-login-new-runtime).

`@colyseus/database` boots a SQLite schema through Drizzle using Node's synchronous
SQLite connection. Character documents occupy cloud-save slot 0; identity hashes
and world membership use Emberfall tables. Save format versions are distinct from
the cloud-save write revision. Small transactions use compare-and-swap revisions,
validate documents, and atomically save class changes before updating live state.
The repository's isolated SQL adapter is tested against the public Colyseus save
service; dependency upgrades must retain that compatibility.

Autosave runs every five seconds and disconnect also saves. A failed live save
retains state for retry. Shutdown attempts every character, closes transport and
database resources, and reports any failed writes with a nonzero exit status.
There is no asynchronous write queue. A crash can lose progress since the last
successful save. Restart restores village membership, not combat. Legacy import
reads an offline backup into a new destination and refuses to overwrite either
an existing destination or the source. See the
[server guide](../../packages/server-new/README.md) for commands and identity
transfer. SQLite and the shared party registry require a single server process.

## Equipment and typed damage

`common-new/definitions/equipment` declares slot compatibility, gear definitions
and per-class starter IDs. `equipment.ts` derives totals from equipped IDs;
simulation, prediction and presentation consume that calculation. Equipment lives
in per-class progress. Saves without equipment migrate at decode; invalid items,
incompatible slots and wrong-class gear are rejected. Existing entity payloads
carry equipment and typed/critical hit events without client stat messages.

Weapon power replaces hardcoded direct damage; fire splash keeps its one-third
ratio. A shared weapon-hit path rolls criticals on the server. Ailments explicitly
carry their damage type and never reroll criticals; Bear remains physical. Armor
mitigation applies to incoming player hits. Max HP synchronizes from equipment
at authoritative lifecycle/tick boundaries and clamps current health.

Enemy damage events carry optional `ownerId` from the authoritative hit path,
including attributed ailments and companion hits, through the existing event
payload. `damage-text.ts` groups detached events by owner, target and damage type
in fixed 10 ms windows anchored to the first hit, shared by both render paths.
It copies events for presentation, leaving combat events and other hit effects intact.
Missing ownership bypasses grouping; any critical hit marks the displayed sum critical.

The UI exports a controlled EquipmentPanel with positioned slot views and stat
rows, with no game-package dependency. Client configuration maps slots to grid
coordinates and fallback images, passing definitions/totals into the UI. The
existing GameWindow supplies dragging, focus and close behavior.

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

## Verification

Run ported rule/prediction tests against new imports, native Colyseus integration
tests, isolated persistence round trips/conflicts/restarts, dependency boundary
checks and browser scenarios. Verify PixiJS screenshots and representative frame
times separately. Passing sampled scenarios does not establish pixel-identical
rendering, hardware GPU throughput, or production capacity. Keep measured limits
alongside results in the verification record.
