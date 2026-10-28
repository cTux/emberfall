# Game runtime

Status: implemented sole runtime. The former `*-new` packages now occupy
`packages/common`, `packages/server` and `packages/client`; the original runtime
and its comparison suite are retired. Gameplay specifications remain the
behavior contract. See the
[verification record](../plans/new-runtime.md) for measured coverage and limits.

## Game composition

Core initializes registries and the explicit bundled mod list before gameplay.
[Mod requirements](../specs/mods.md), [registry design](mods.md) and the
[verification plan](../plans/mods.md) define supported extension and compatibility.
Common retains structural contracts and pure geometry; content-aware rules and
views belong to core. Existing saved IDs and host responsibilities remain intact.

## Ownership

Storehouse names, inventories and gold live once in the account's version-2 save,
outside its class records. Each Steam account owns one saved identity with multiple
classes; existing duplicate-session protection prevents concurrent owners. Live
player `coins` and `storages` project this account state for existing pickup,
trading and UI consumers. Class selection preserves those fields. Version-1 saves
merge old balances and tab contents once, returning overflow to owning backpacks;
version-2 reads never re-import class balances. Older servers reject version 2.
The existing character transaction saves detached transfer/rename results
before publishing them. The server validates session ownership, living village
status and Storehouse proximity. The client composes ChapterTabs and Backpack;
storage capacity is 40 while the existing player backpack remains 20 slots.

Inventory dragging uses native browser drag events in controlled Backpack and
ChapterTabs views. Per-inventory MIME types identify allowed sources before drop;
the payload contains only an item ID. The host sends existing store/trade commands
or a validated storage-to-storage command. The server derives the owner from the
session and saves detached results before publication; drag data never supplies
items, quantities, currency or a different owner.

- `common`: shared contracts, structural schemas, protocol state and pure geometry.
  No DOM, database or network connections and no dependency on core.
- `core`: registries, bundled mods, semantic validation and shared combat/prediction;
  depends on common. Only the server rolls spawns and rewards or applies damage.
- `server`: authoritative Miniplex entities, ordered fixed-timestep systems,
  Colyseus transport/state projection and Colyseus database persistence.
- `client`: Colyseus SDK, presentation/prediction Miniplex world, PixiJS world
  rendering, audio and screen composition using the shared UI package.
- `ui`: controlled components and theme for the client and Storybook.

Definition objects describe types; mutable entities describe instances. Stable
definition IDs connect them. The simulation owns live state; network projections
and render objects never write damage, rewards or saved progress back into it.

Training definitions keep the 270-unit combat radius separate from the 135-unit
vegetation clearing radius, preserving seeded tree placement. The client renders
dummies without a zone fill or outline; shared wrapped geometry still gates attacks.

Village dummies join the same foot-position render sort as scenery and actors. Foreground actor bodies and scenery share an inverse stencil mask of the reconciled local player’s current sprite silhouette, dilated by 10 game pixels. The cutout reveals previously drawn world layers while preserving opacity elsewhere; health bars keep full opacity. Frame silhouettes are rasterized and expanded once per source pose and integer display size, then reused as non-overlapping horizontal stencil spans. The renderer owns the reusable mask geometry and releases it on disposal. Shared player definitions own the reduced body and incoming-projectile hit radii.

## Simulation and replication

After authoritative forest combat (including kill credit and shared pickups),
`server/scenes.ts` applies `core/levelUp` to each player's level, XP and paragon.
The existing per-entity payload replicates these fields; prediction never grants
progress. Per-class saves include optional paragon, defaulted to zero on decode;
legacy levels above 20 are folded into paragon. Existing autosave, class-switch,
disconnect and shutdown writes retain all three fields. The client uses core's
`experienceRequired` formula and passes confirmed values to the controlled
PartyCard XP meter. No stat changes or progression prompts are introduced.

The registered village definition owns resident identities, home positions,
personalities, personal backgrounds, conversation topics and walking stops. Each personality describes a distinct speaking
style, comic habits and an illustrative line. Every generation receives the
speaker's registered personality, including greetings, player replies and NPC
continuations. The shared model prompt asks for that voice throughout, with
frequent situational fantasy humor and fresh callbacks to recent conversation;
examples guide tone rather than supplying canned responses. `server/npcs.ts` runs one `VillageLife` scheduler
per occupied world. Each resident draws without replacement from 32 topics; NPC
continuations retain the opening topic. The prompt includes the speaker’s background
and recent lines, while player replies answer the quoted speech first. Topic
rotations are temporary world state. Canonical NPC components live in its existing Miniplex world.
Each resident randomly chooses its next stop, excluding its previous destination and
preferring unclaimed stops, with independently randomized 5–9 second pauses.
The definition also owns eight workstations with resident/building IDs, art indices,
activity kinds, equipment positions and worker anchors. After 25–45 seconds residents
return to their alternating home workstation. Arrival starts 60–90 seconds of active
work; fixed-tick deltas consume the remaining duration only while working with village
players present. Interactions, pending/generated conversations and visible speech suspend
work. Optional `workstationId` and `workStartedAt` fields replicate the active pose through
the existing entity payload; suspended sessions remain private to `VillageLife`.
The client reuses actor action poses and draws timed work tools/effects without combat
commands. Workstation art uses the scenery atlas cache, wrapping, depth and shadow path.
The server advances walking on the fixed tick and starts bounded asynchronous
requests through one shared `OllamaNpcDialogue` provider. Player mentions and NPC
continuations carry a simulation-time deadline two seconds after the triggering
message; the scheduler waits until that deadline and revalidates participants
before generation. One pending player reply can wait behind an active request;
it takes priority over and replaces queued NPC banter. Further player questions
are ignored while a player reply is queued, generating or waiting to retry.
Position deltas use the existing
Colyseus entity projection and detached snapshot interpolation. `nearbyInteraction`
accepts live NPC positions so trading follows Marta. The client sends `npcInteraction`
when her trading window opens or closes. The server validates the session-owned
player and live interaction range, tracks active traders per player, and releases
invalid interactions each tick. Proximity alone does not pause walking.
NPCs and memory are not persisted. World disposal
removes components and aborts pending dialogue.

Ambient cat interaction remains client presentation. `critter-motion.ts` assigns
stable wrapped home identities; `cat-speech.ts` holds per-cat two-second responses.
`Arena.tsx` adds cat sprite masks to the existing interaction targets and draws
speech using the shared bubble renderer. Local interaction callbacks let E and
clicks use the same cooldown without adding network messages or server state.

Chat entries optionally carry a dimension, NPC identity and announcement tone.
Server broadcasts share one prepared projection per dimension; the latest ten
visible messages are selected from a bounded world history. Existing player and
system chat remains world-wide. NPC art joins the existing scenery depth sort,
mask/shadow path and wrapped camera. Silence icons reuse `drawDebuffs` and the shared ailment asset map, drawing the
same 12-unit framed icon without a stack count in the overhead status row at every
quality setting. The common `DebuffIndicator` contract supports timed and
indefinite presentation; the registered non-damaging `silence` kind is reusable
for future player statuses. The finite atlas-cell cache does not retain world instances.
See [SCENE-06](../specs/scenes-and-village.md#scene-06--village-life) and
[CHAT-04](../specs/worlds-and-chat.md#chat-04--npc-speech-and-silence) for timings,
free-route failover, visibility and recovery rules.

Gold collection adds one coin to the nearest living forest collector, once, in shared simulation. The live player `coins` field projects the account Storehouse balance. Version-2 saves persist that balance once outside class records, using the existing autosave lifecycle. The party HUD, Storehouse and trading UI receive the same confirmed balance.

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

`common/protocol` projects plain state into native Colyseus schema records.
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
Verification: [hitbox overlay tests](../../tests/hitboxes.spec.ts).

Gradient ramps are baked once onto transparent textures and cached independently
of world position, so vignette centers preserve the scene beneath them. SVG
status assets are rasterized once at their decoded dimensions before GPU upload.
The WebGL back buffer is enabled for soft-light color grading to blend with the
scene instead of falling back to a plain translucent fill.
Its blend filter unpremultiplies texture colors before applying the Canvas
soft-light equation, then composites alpha once.
The renderer pixel tests compare gradient blending with Canvas and check all five
debuff glyphs, including reuse of pooled sprites.

## Compatibility

The original runtime and parity tooling are retired. Canonical commands are
`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm test`, `pnpm typecheck` and
`pnpm test:browser`. Existing ports, `PORT_NEW`, `SAVE_PATH_NEW` and browser
storage keys remain compatible. Retained original assets keep their attribution.
The default database directory changes with the package path; see
[operations](../operations.md#persistence-and-backup) before upgrading a deployment.

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
[server guide](../../packages/server/README.md) for commands and identity
transfer. SQLite and the shared party registry require a single server process.

## Equipment and typed damage

`core/mods/base.mod.ts` registers slots, gear, stats and per-class starter IDs.
Core's bound equipment rules derive totals from equipped IDs;
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

The shared renderer derives pop scale, eased rise, lateral drift and final fade
from the first event's server timestamp. Event IDs select one of five stable
horizontal lanes; rebuilding a snapshot cannot restart an animation or change
its lane. Critical text has a larger base font. Transform scaling keeps font
styles constant during animation, and a dark outer stroke supports readability
over scenery. Projection remains owned by each area's wrapped camera. No local
event queue, timers or combat mutations are needed.

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

Run rule/prediction tests against canonical package imports, native Colyseus integration
tests, isolated persistence round trips/conflicts/restarts, definition validation and browser scenarios. Verify PixiJS screenshots and representative frame
times separately. Passing sampled scenarios does not establish pixel-identical
rendering, hardware GPU throughput, or production capacity. Keep measured limits
alongside results in the verification record.

## Inventory, loot and shared trading

`core/content/rules.ts` owns validated 20-slot backpack entries, stack merging,
gear exchange, consumable use, one-item trades and atomic whole-backpack sales.
Merchant buyback is a separate newest-first queue capped at 20 entries, including
whole consumable stacks from Sell all. Buying returns one item per action.
Legacy merchant gear stock migrates to buyback; potion stock stays in Buy.
Stable entry IDs make stale
commands harmless. Gear definitions are the single source of armor and price.
Per-class progress includes the backpack; older saves default to an empty array.
Forest kill drops join the existing wrapped pickup system; training exits before
rewards. The saved client `autoLoot` preference travels in validated combat input; the server excludes players with it disabled from item attraction and collection, without changing XP/gold eligibility. Missing fields retain automatic pickup for older clients. The client renders confirmed inventory and never grants items or coins.

`runtime.ts` derives item ownership from the authenticated session. Trading also
checks village proximity. Item commands mutate a detached copy, save first, then
publish live state. `characters.ts` stores shared merchant state by world ID and
commits it with the character save in one SQLite transaction. Single-process
synchronous commands serialize competing buyers; the first successful transfer
removes the entry before another can buy it. World deletion deletes merchant state.
The existing protocol payload carries backpacks and merchant state without a
second transport. UI components remain controlled; host callbacks send commands.

Merchant state includes a persisted `refreshAt` deadline. The server checks it
against wall time every tick, replaces regular stock and gold from `freshMerchant`,
and retains buybacks. It saves before publishing stock or the system chat notice;
failed writes retain the old state and retry at the autosave cadence. Legacy merchants without a deadline
refresh once on load. Empty bottles use the existing resource stacking rules.

Verification: `packages/server/src/inventory.test.ts` and
`tests/inventory.spec.ts` cover transfers, failures, migration, restart,
stacking, loot, unarmed casting and the replicated UI. `tests/auto-loot.spec.ts` covers the live setting, item pickup and reload persistence.

## Talent configuration

[PROG-03](../specs/progression.md#prog-03--talents) uses core's immutable
[class talent catalog](../../packages/core/src/talent-catalog.ts), allocation
rules and registered ability definitions. Three columns expose ten level-gated,
two-rank nodes per class. Available points equal normal level minus spent ranks.
Versioned per-class save normalization refunds old allocations once and repairs
invalid or over-budget records without changing other progress.

Learning, equipping and bullseye resets use detached mutations saved before
publication. Four saved slots reference learned ability node IDs. Cooldowns are
keyed by ability ID, so reassignment does not bypass recovery. Reset clears
assignments and transient combat effects after the transaction succeeds.

`talent-effects.ts` owns authoritative direct hits, scheduled pulses, ailments,
consumption, companion commands, healing, barriers, control and triggered effects.
The shared forest/training tick executes scheduled effects and invalidates them
on death, class/scene departure or reset; pause/resume preserves their timing.
Damage and deaths use the existing shared hit/reward path. Training grants no
rewards. Confirmed explosion events carry the talent class and column for animated
cast art and optional particles in both renderers. These visuals never apply
client damage. The UI supplies independent columns and themed rank tooltips;
right-click/F2 assignment uses the existing action bar.

## Parties and dimensions

The runtime owns temporary party membership, leader order and expiring requests.
Player payloads carry party, home-run and current-run IDs. Each run owns a separate
Miniplex player index and scene; the shared village training ticks once per world.
Projection chooses the viewer's run and filters remote forest occupants by run ID.
Party request visibility is private per viewer, so state broadcasts are per session.
Party commands use authenticated ownership and the existing chat rate limit.

Loot hints observe detached, authoritative local backpack totals in `Arena.tsx`.
The initial snapshot seeds a silent baseline; later positive item quantity deltas
create local presentation entries. This also covers gathering, trading and storage
receipts. Decreases and inventory rearrangement produce no hints. Entries use
monotonic client time, follow the reconciled local player in both scenes, and
expire after 2100 ms. The local preference clears entries while disabled and
continues updating the baseline to prevent replay. No save or wire schema changes
are required. Rendering reuses bundled item/plant art through native Pixi commands.
