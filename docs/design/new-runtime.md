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
  rendering, audio and screen composition using the unchanged shared UI package.
- `ui`: shared controlled components and theme for both runtimes.

Definition objects describe types; mutable entities describe instances. Stable
definition IDs connect them. The simulation owns live state; network projections
and render objects never write damage, rewards or saved progress back into it.

## Simulation and replication

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
World text uses nearest-neighbor sampling at its native glyph resolution to keep
enlarged labels and damage numbers consistent with the pixel-art sprites.

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

## Verification

Run ported rule/prediction tests against new imports, native Colyseus integration
tests, isolated persistence round trips/conflicts/restarts, dependency boundary
checks and browser scenarios. Verify PixiJS screenshots and representative frame
times separately. Passing sampled scenarios does not establish pixel-identical
rendering, hardware GPU throughput, or production capacity. Keep measured limits
alongside results in the verification record.
