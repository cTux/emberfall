# Emberfall

Online-only 2D multiplayer bullet hell foundation. Working title; the current slice is world creation, discovery, password-protected joining and a village staging area and timed cooperative forest combat. Visual direction: [Asgard's Fall](https://store.steampowered.com/app/2780710/Asgards_Fall__Viking_Survivors/). No game assets are copied from that reference.

## Run

Requires Node 24 and pnpm 11.

```sh

pnpm install

pnpm dev

```

Open https://localhost:5173. Open a second browser session to join the same world. WASD or arrow keys move your character. Every session connects to the server; there is no offline or local-play mode.

```sh

pnpm build

pnpm start

```

Production serves the built client and secure WebSocket endpoint together at https://localhost:3001. `pnpm dev` and `pnpm start` create a self-signed certificate in ignored `.certs/` if missing (PowerShell 7 required for generation). The certificate covers localhost and current LAN IPv4 addresses and lasts one year. Browsers show a warning until the public certificate is trusted; private keys must never be shared. The OS trust store is not modified. HTTP and HTTPS have separate browser storage, so a saved nickname/character token on the old HTTP origin does not automatically migrate.

For a temporary internet test, build and run `pnpm start`, reserve this PC's LAN address in the router, and forward **TCP 3001 → PC:3001**. Visitors open `https://PUBLIC_IP:3001`; both game traffic and files use that port, with no UDP or separate WebSocket port. Allow inbound TCP 3001 in Windows Firewall on the active network profile. Keep the Vite development port 5173 private. An alternative is external TCP 443 → PC:3001, then use `https://PUBLIC_IP`. External testing requires a public reachable address: CGNAT or upstream double NAT needs ISP/router changes or a tunnel. Test from mobile data, not from the same LAN. A local self-signed certificate causes a warning on other devices and does not cover a public IP; use a domain and publicly trusted certificate for regular hosting.

`PORT` and `HOST` configure the server. `TLS_CERT` and `TLS_KEY` accept certificate/key PEM paths for a trusted certificate. `HTTP_ONLY=1` explicitly disables backend TLS when using an HTTPS/WSS reverse proxy; do not expose that plaintext backend directly. Local HTTPS follows [Vite's server HTTPS configuration](https://vite.dev/config/server-options#server-https).

## Packages and behavior

- `packages/common`: shared TypeScript messages, world/player types, constants and Zod input schemas. Intentionally exports source consumed by Node 24 and Vite.

- `packages/client`: Vite + React compact lobby, Canvas 2D forest, sprite rendering and instant local movement with authoritative reconciliation. The browser package can later be wrapped for native OS distribution; no desktop runtime is installed now.

- `packages/server`: Node HTTP/WebSocket runtime, Vite SSR-targeted production bundle. Development uses Node's native TypeScript/watch support. Vite builds server code; it is not itself a multiplayer server framework.

Worlds are public in the server directory, optionally password protected, and limited to 8 players (MVP assumption). The server creates an unlocked "New Permanent World" at startup, visible and joinable through the normal world browser without a password. It retains its identity when empty; its host label and scene reset on the last departure, and its next player receives the host label. Creation joins the creator. A host leaving transfers the host label to the next player. Leaving or closing a browser normally removes the player immediately; the final departure removes player-created worlds. An interrupted connection retains its player and world for 30 seconds, including position, portal vote and forest membership. The client retries immediately after a failed connection or interruption, then once per second after repeated connection failures, and authenticates with its existing character key to resume the same session without a password prompt. Movement input is cleared on interruption. The shared world continues running during recovery. Expired sessions are saved and removed by the next five-second autosave pass. Restarting the server resets temporary world state and recreates New Permanent World; if recovery is unavailable, the client shows an error and the world browser so the player can join or create a world with their saved character. There are no login accounts, private/unlisted worlds or ownership privileges.

The server owns positions at 20 Hz, normalizes diagonal movement, bounds positions, and clears stale input. Input/schema validation, payload and connection limits, bounded password-hashing concurrency, per-connection rate limits, slow-consumer eviction and heartbeat cleanup protect the basic protocol. Passwords use salted scrypt and never appear in world listings. Same-origin browser WebSocket connections are enforced. Internet hosting should additionally enforce ingress/IP limits at the reverse proxy; per-connection limits do not stop reconnect-based abuse.

Rendering runs independently of React at the display frame rate. Forest combat uses up to 160 enemies per scene; red projectiles are capped at 160. Before adding large waves, profile a WebGL sprite batch renderer, spatial partitioning and compact/delta network snapshots against an explicit enemy/player target. Preserve server authority and keep high-frequency entities out of React state.

## Checks

```sh

pnpm fmt:check

pnpm lint

pnpm typecheck

pnpm test

pnpm build

pnpm exec playwright install chromium

pnpm test:browser

```

The socket test covers world discovery, password rejection, joining, movement validation, capacity, isolation, host migration and cleanup. Browser coverage uses two isolated sessions against the production build and saves desktop/mobile screenshots under `test-results/`.

## Assets

Class weapons use the free CC0 [496 RPG icons by Henrique Lazarini (7Soul1)](https://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg): sword, bow, gold mage staff and green druid staff. [Game-icons.net](https://game-icons.net/) provides bleeding, poison, burning and plant-roots symbols under CC BY 3.0, credited in the Codex and `public/assets/status/CREDITS.txt`. These clear silhouettes remain readable in the compact nameplate row; the weapons retain the game's pixel-art style.

Active enemy debuffs appear as centered 16-unit icons with a 2-unit gap above the health bar, with only outlined stack counts in their lower-right corners. Roots use the same row instead of drawing vines at the feet. Expired effects disappear and an empty row takes no space. Weapons appear on living characters and animate with their existing attacks; wardrobe choices show weapon and ability icons. Combat rules and network state are unchanged. Existing browser coverage checks all class assets, icon placement, expiry and stacks.

Selected original sprites are copied from the adjacent `ninja-adventure-gallery/src/assets` directory into `packages/client/public/assets`. The original gallery is unchanged. Ninja Adventure by Pixel-boy and AAA is CC0; the original license and credits accompany the copies. [Asset source](https://pixel-boy.itch.io/ninja-adventure-asset-pack).

## Viewport, party and obstacles

The arena fills the viewport with an aspect-preserving camera that follows the local player when the map is cropped. Codex, settings and exit are compact controls; the bottom-right circle reports connection status. Codex/settings use draggable modal dialogs and suppress movement while open. Settings can toggle ambient particles. Nicknames persist in browser localStorage; when storage is blocked the session still works.

Party cards show each character's name, level and HP/MP bars from server state. Initial values are level 1, 100/100 HP and 50/50 MP; forest combat deals damage and grants 1 XP per kill; level advancement is not implemented. Shared deterministic tree data drives both rendering and server collisions. Circular bodies slide around trunks with substeps to prevent tunneling; the shared `moveActor` function is actor-neutral and tested for player and enemy body sizes. Forest enemies use the same collision rules as players. Trees and players render in depth order.

## Character saves

The server uses Node 24's built-in SQLite database at `packages/server/data/characters.sqlite` in both development and production. `SAVE_PATH` overrides this path; keep it on persistent storage. Saves include name, level, XP, current/max HP and mana, and total time in worlds. World membership and position remain temporary. Saves happen on entry, every five seconds, on leave/disconnect, and on graceful shutdown; an abrupt process or machine failure can lose up to five seconds of recent changes. SQLite uses WAL and full synchronous writes. Stop the server before copying the database for backup, or use a SQLite-aware online backup that includes committed WAL data. Never put the database under the client public directory.

A server-generated 256-bit bearer key in browser localStorage identifies the character; only its SHA-256 hash is stored in the database. Nicknames are not credentials. Clearing browser site data loses access to that character; there is no account recovery or cross-device login yet. Duplicate active sessions for the same character are rejected. The browser cannot write levels, XP, or stats. Failed loads do not silently reset characters; failed saves are reported and retried. Forest kills add 1 XP each; playtime also progresses. Dead characters revive on rejoining a village. Every return from a scene (return portal, death window, or leaving early) restores the returning player to maximum health and mana and their companion to maximum health immediately, clearing any pending companion resurrection. Bear has no mana stat.

## Graphics

Settings contains Low, Balanced and High (default) presets, plus persistent individual toggles. High enables soft projected tree shadows, 2D contact ambient occlusion, dense grass clusters, sprite-only motion blur, flickering campfire/player lighting, bloom, and ambient particles. Resolution options are 75%, native and 150% supersampling, with backing pixel density capped at 3x. Changes apply immediately and do not change server simulation or collision geometry.

These are Canvas 2D effects: ambient occlusion shades ground contact, not depth-buffer SSAO; motion blur samples moving sprites and leaves text sharp. Static ground, shadows, grass and contact occlusion are cached and rebuilt only when settings or assets change. High is the default visual preset, not a measured claim of high-enemy-count performance. [Node SQLite API](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).

## Village and lighting

The lobby is a five-building village with a connected path network and a central square. Buildings use the original Ninja Adventure house tileset. Buildings and tall torch posts have server-side collision footprints; every door has a clear approach. Building interiors and services are intentionally not implemented yet.

A distant sun at (-6000, -8000), elevation 10000, produces parallel projected silhouette shadows throughout the village. Tall path torches cast warm light with weak, radius-limited occlusion (145 world units); every player wears a visible belt lantern with a moving 110-unit light radius. Local shadows project away from their emitter, weaken with distance and disappear outside its radius. Trees, buildings, grass, torch posts and character sprites participate. A lantern does not shadow its own wearer. Sunlight is directional 2D projection, not a 3D renderer.

Static sun shadows and static torch occlusion are cached; dynamic character blockers and belt lanterns update as players move. Light scratch canvases are reused. Existing Soft shadows, Dynamic lighting and Bloom settings control these passes. Disabling effects never changes collision geometry. The sun stays offscreen; no sun decoration obscures the playable map.

## Forest scenes and interactions

The create/join browser shows a forest backdrop; entering a world takes players to its village. E interacts within 68 units of a blue portal or building doorway, with a proximity prompt. Buildings currently open service placeholders. All windows have a draggable title and close button; closed browser/death windows have a reopen control. Text selection is disabled throughout the game.

The village portal offers Forest / Easy. Creating allocates a server-owned scene before entry. All connected party members must vote ready; unanimous readiness starts a five-second countdown. Retracting a vote cancels it. Joins invalidate unanimity; departures restart the countdown with the remaining electorate. At completion, the server teleports the party together and starts a 120-second run. Players may join a world at any time, subject to its password and capacity. Late joiners arrive in the village and can use its portal to join the active scene; players who return early can rejoin the same way. Joining uses the existing scene and deadline, including while the boss is alive. An unfinished scene stays joinable even when every participant returns to the village. Once the boss dies and return portals open, entry is closed; no living players may remain inside before a new scene can be created. One scene per world is supported, and an empty world resets its scene. Party members in another dimension use 40% opacity (60% transparency); members in the same dimension remain fully opaque.

The forest is 4800×2560 (20 times the village **area**, not each dimension). It wraps on all four edges. Tree generation and nearby-cell collision queries are shared; combat distances and client interpolation also wrap. Players automatically slash a sword every 700 ms for 5 damage, in a forward semicircle within 88 units, aimed toward the nearest enemy. Enemies target the nearest living forest player using wrapped distances. Shared deterministic steering routes around nearby trunks, and a wrapped spatial grid separates bodies according to their radii (8–16 units). Every tenth successful spawn is an elite (50 HP, yellow health bar); normal enemies have 10 HP. Skeletons move at 64 units/second, small slime runners at 104, large bear brutes at 40, and ranged eye casters at 54. All hits deal 10 damage with a one-second per-player damage cooldown. Melee windups are 500–1000 ms: a ground circle fills red before damage, and targets outside its range are not hit. Missed attacks resume chasing. Casters stop within 210 units, wind up for 900 ms and fire red projectiles at 210 units/second toward the marked location. Projectiles use swept substeps, wrap, collide with trees and players, and expire after 2.5 seconds. All enemy spawns, including bosses, have a one-second red zone before becoming solid; occupied spawns wait until their space clears. The server owns attacks, damage, deaths, votes, membership and deadlines. Enemy spawning is bounded at 160 per scene; network snapshots are still full snapshots, not a large-horde scalability claim.

When no living players remain in a generated scene (everyone died or left; interrupted connections retain membership during the existing recovery window), combat and scene time pause. Enemies, projectiles, spawn warnings, debuffs, loot expiry, and companion actions wait; rejoining resumes their remaining durations and the boss timer. Living village players do not keep the forest running. The village portal still allows rejoining an unfinished scene and also offers Regenerate scene while no living players are inside. Regeneration replaces the old scene with a fresh departure vote and returns any dead participants to the village with restored stats. The server rejects regeneration during voting/countdown or while even one living player remains inside.

At timer expiry, regular spawning continues and one 200 HP boss with an orange health bar appears. The scene stays active until the boss dies; only then do remaining enemies disappear and a fixed blue return portal appears at each participant's feet, including players far from the original clearing. E near it returns a player to the village. A dead player can return immediately using their death window while teammates continue. Escape opens a confirmation: leaving a scene returns to the village without removing party membership; leaving the village exits the world. Escape while a modal is open closes that window first.

Settings are grouped into Gameplay (floating damage numbers, FPS and latency graph toggles), Graphics, and Sound (sampled effects, music, and independent volumes). Preferences persist locally. Codex documents controls, combat rules, scenes, persistence and current building limitations. Fog is an animated, seamlessly tiled, layered Canvas 2D approximation of volumetric fog, not 3D ray marching; Low disables it, Balanced/High enable it. Static fog textures and sprite masks are cached. Forest drawing culls offscreen scenery and uses local collision queries.

Scene tests use explicit timestamps to verify the full two-minute deadline without sleeping, including readiness cancellation, party changes, damage, death, cleanup, returns and wrapping. Browser tests cover two independent clients creating a scene, retracting votes, teleporting, fighting, individual exits, window dragging and settings persistence.

## Authoritative movement and visual feedback

Gameplay settings can independently show FPS and server latency together at the top left. Latency is a measured WebSocket ping/pong round trip in milliseconds, sampled every two seconds with a monotonic client clock. The toggle persists; a missing or disconnected measurement shows a dash.

The latency axis is labeled Ping. The same toggle also shows input acknowledgement delay (the latest consumed command's send-to-snapshot delay, or the oldest outstanding command's age if greater) and local snapshot age (time since the newest received snapshot plus interpolation backlog). Local snapshot age excludes network transit; it uses only the monotonic client clock and differences between server timestamps, so clock skew cannot inflate it. A low ping does not imply fresh movement acknowledgements or snapshots.

Local movement predicts immediately with the same obstacle checks as the server. Numbered commands carry up to 50 ms of movement duration; the server consumes at most 50 ms per tick, acknowledges the exact sequence and consumed duration (including partial commands), and rejects stale area inputs. The client starts from that authoritative position and replays only unprocessed durations, never comparing its current position directly with an old server position. Queues are bounded; prediction stops extending after one second without acknowledgements. Browser stalls add at most 100 ms per update.

Before consuming a timed-input tick, the server discards oldest commands until at most 100 ms remains queued. Discarded commands are acknowledged without moving the player; a burst cannot increase speed or keep a new stop behind a second of old movement. The client reconciles skipped durations using the same acknowledgement path.

The underlying position always reconciles. Only the drawing offset has a two-unit tolerance: tiny differences do not visibly move the character; accumulated offsets between 2 and 20 units decay with a 120 ms time constant. Errors over 20 units, area changes and death snap. Drawing offsets obey obstacle collisions and wrapping, and walking animation follows collision-checked local input. The camera and attachments follow the same displayed player. Remote players, enemies, remote projectiles and combat feedback retain their roughly 100 ms snapshot interpolation buffer. Local sword animations and sounds extrapolate the server swing phase between updates. Local ranger/mage projectiles launch at the displayed player, then fly independently; attack timestamp and volley index match predictions to authoritative shots, with 120 ms visual correction decay. Confirmed removal removes the shot; unmatched predictions expire once server time passes their attack by 350 ms, or at their maximum travel distance during a packet gap. Server-selected loot attraction carries a collector ID; loot attracted to the local player follows its displayed position, finishing its visual flight for at most one second after server removal. Area changes and death clear local presentation state. These effects never apply hits, damage, health, deaths or rewards. Network latency can still cause visual and authoritative positions to differ. Interactions still require server-validated proximity.

Older direction-only clients retain a 250 ms held-input timeout; a connection cannot switch input modes mid-session. Timed commands cannot accelerate simulation by sending a burst, and duplicate sequence numbers are ignored.

Portal voting lives inside the draggable portal window, with a compact control to reopen it. Prompts project each source's world coordinates through the camera, rather than sitting at the screen edge. Village and return portals have an animated blue pixel-ripple interior, a pale blue rim, and outward-drifting square motes. Bloom adds a soft blue glow; the surface remains visible with bloom disabled. Portal bodies and their fading blue motes draw before characters. At scene completion each player's nearby portal stays fixed where it spawned.

Enemy/player hits briefly draw a red sprite outline, including a short silhouette on killing blows. Local damage also flashes the screen red. A persistent Vignette toggle controls edge darkening in both village and forest. Fog and flying ambient particles use world coordinates and seamless world-sized repetition; camera movement only changes which portion is visible.

## Graphics audit, audio and combat performance (2026-10-01)

The supported renderer remains Canvas 2D. Added sunlight shafts, soft-light color grading, adaptive resolution and frame caps (display refresh, 30/60/120/144 FPS). Adaptive resolution adjusts the selected render scale between 50% and 100% every two seconds based on frame time; it never changes world size, input cadence or collision geometry. Low/Balanced enable adaptation; High prioritizes fixed resolution. Red gameplay warnings remain enabled at every preset. Native DLSS, frame generation, hardware ray tracing, depth-buffer SSAO and HDR output are not advertised as working Canvas settings. NVIDIA's [DLSS integration requirements](https://raw.githubusercontent.com/NVIDIA/DLSS/main/doc/DLSS_Programming_Guide_Release.pdf) require a native graphics pipeline and depth/motion data. A renderer migration would be a separate project.

[FREE fantasy music by TimberwolfGames](https://timberwolfgames.itch.io/free-fantasy-music) supplies six CC0 tracks: Intro / Theme_001 (start), In The Woods / Adventure (village), and Trials / Wastelands (combat). Each two-track playlist repeats indefinitely and resumes its selection when returning to an area. Music crossfades between areas, starts after a user gesture, pauses in hidden tabs, and has independent enable/volume controls. Sampled effects use bounded voice pools and the existing CC0 Ninja Adventure pack. Original licenses and filenames are in `packages/client/public/audio/CREDITS.txt` and `CC0.txt`.

Client rendering predicts only local movement and sword presentation; it does not run enemy pathfinding or combat simulation. Presentation copies only actor positions, culls offscreen actors before sprite masks/shadows and indexes recent hit events once per frame. These choices follow [Canvas optimization guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas). Bosses display a fitted player-style nameplate: The Hollow Warden.

Run `node scripts/benchmark-snapshots.ts` for a repeatable snapshot presentation CPU benchmark (160 enemies, 300 warmed samples). This is a CPU-path microbenchmark, not an end-to-end FPS claim. Browser tests cover instant local movement during delayed snapshots, tiny correction tolerance, boss nameplates, real playback and repeated playlist cycles in all three areas, muting, and a dense-scene frame-time sample.

Diagonal facing retains its current valid axis near a 45-degree heading to prevent sprite flicker. Player sword reach is 88 units (previously 72), shown as a green forward semicircle on the ground at every graphics preset; the fill pulses on swings. The sword visual and server hit distance share the same range constant. Damage remains 5 per swing.

The top-left performance panel overlays a green FPS trace and blue round-trip latency trace on one 30-second scrolling graph, sampled twice per second. The duplicate numeric caption is omitted; color-coded axis ranges (for example 0–240 FPS and 0–100 ms) describe the scales, not current readings. Both traces are enabled by default, with compact 8-pixel side padding. Each trace retains its own saved visibility toggle; disabling both hides the panel. A DPS meter sits between the graph and party list (and stays visible when the graph is hidden). It shows your actual enemy damage over a rolling five-second window, divided by five, including damage over time and the companion; overkill is excluded. The server calculates it from the shared hit path, and it returns to zero after five seconds without damage.

The lobby has two marked training clearings: one skeleton dummy on the west side and six in a 1/2/3 triangle on the east side. Each has 1,000,000,000 HP, replenished to full every second by the server. Dummies never move or attack and award no XP or loot. Player attacks, ailments, projectiles, and the companion use the same combat handling as the forest. The unlabeled areas each have a 135-unit horizontal radius and a 114.75-unit vertical radius. Lobby auto-attacks and companion hunting start only while the player's feet are inside either area and stop on leaving; already-fired projectiles and ailments can finish. Forest combat is unchanged. Training state is shared within each world and separate from the forest scene.

During an active boss fight, forest players see a fixed top-center boss HUD with the boss name, orange health bar and current/max HP, even when the boss is offscreen. It replaces the boss objective label and disappears on defeat or returning to the lobby; the scene-complete message then appears.

Sword aim tracks the closest living enemy every rendered frame and server tick, rotating along the shortest arc with shared 80 ms exponential smoothing (about 240 ms to complete 95% of a turn). Both hit detection and the green zone use this smoothed angle. During each 260 ms active swing (700 ms cooldown), the server checks every enemy collision body against the green half-disc, including radius and diameter edges and forest wrapping. An enemy can take 5 damage only once per swing, even if it enters late or aim changes. The green pulse and sword animation use the server swing phase rather than an independent attack timer.

Combat presentation includes sword sparks, enemy attack sparks and short red blood bursts for damaged players and enemies. Killed enemies drop a glowing, gently hopping experience orb and independently have a 10% chance to drop a gold coin. Server-owned drops are collected within 22 units after a 300 ms initial hop; collection removes them for everyone but grants no stats or currency yet (existing kill XP is unchanged). Drops remain collectible after boss defeat, expire after 60 seconds, and are capped at 512 per scene. Glow textures are cached, offscreen drops are culled, and blood rendering is limited to 80 recent hit events.

Clicking I'm ready closes the portal dialog; the Portal vote button reopens it to retract. The five-second departure countdown displays large gold digits that grow and fade each second, with animation disabled for reduced-motion preferences. Regular enemy spawning continues through the boss encounter; boss death alone completes the scene and clears hostiles.

Lobby buildings and portals show interaction availability directly in their existing nameplate: a lighter background and `(E) Building name` while in range. They no longer show a separate tooltip.

Codex uses a parchment book layout with chapter tabs for controls, worlds and party, combat, the boss, character persistence, and credits. Tabs support arrow keys, Home, and End; the book remains draggable and closable.

Enemy deaths retain their own sprite and fall/fade over 0.7 seconds. Thin health bars sit beneath player names. Screen-edge arrows track living teammates in the same area, the boss, and return portals using wrapped forest distances. Experience shards and coins begin attracting after their initial hop, within 140 units of the nearest living forest player, at 280 units/second; collection still grants no reward.

### Classes and ailments

The wardrobe opposite the village portal switches between warrior (default), ranger, mage, and druid, only while in lobby and outside the departure countdown. Existing character saves migrate to warrior; each class keeps independent level, XP, health, mana, playtime, and reserved talent data under the existing browser token. Switching is server-validated by proximity and saved before it becomes visible.
Warrior keeps its 5-damage slash. Ranger fires 5-damage piercing arrows with a 1000-unit travel limit. Mage launches up to two fireballs at distinct enemies within 250 units, with a 250-unit travel limit; each impact explodes in a 100-unit radius for 2 damage. The existing 0.7-second attack cadence is retained. With only one target, mage fires one fireball. A direct hit has a 10% chance to apply the class ailment: bleed, poison, or burn. Each type stacks without a cap, deals 1 damage per stack per second, and shares a five-second expiry refreshed by new stacks. Damage over time does not trigger further ailments; the latest applying player receives kill credit for that ailment.
Non-boss spawns roll once: 10% brute (3x HP), 10% caster (0.7x HP), otherwise regular skeleton/fast melee. Modifiers multiply normal/elite HP; boss remains 200 HP. Debuff icons and stack counts appear above enemy health bars. All classes use distinct supplied character sprites, walking and attack animations. No talent gameplay is introduced yet.

Druid casts roots on up to two enemies within 250 units every 0.7 seconds, preferring unrooted enemies then nearest distance. Roots last five seconds, refreshed without stacking or postponing the next 2-damage tick each second. Rooted ordinary enemies cannot move; bosses show roots and take damage but remain mobile. Root kills use the shared XP, loot, and boss-completion paths.

Each Druid has a permanent companion named Bear in village and forest, with its own health bar and 1.5x the player's maximum HP (assumption). Bear targets and chases the nearest living enemy within 200 units of its owner, using the warrior's 88-unit forward slash geometry, 260 ms active window and 700 ms cadence, but claws deal 2 damage once per enemy per swing. Bear moves at 1.3x player speed (234 units/second) for chasing, returning, and dodging in both areas. Bear approaches an 80-unit gap instead of the enemy center, retreats to restore that spacing when enemies close in, and prioritizes escaping telegraphed attack circles and sidestepping projectiles predicted to pass within 30 units in the next 0.35 seconds. Bear chooses its target and movement destination once per second, then moves smoothly toward that point; short warnings between decisions, hazards, and blocked escape routes can still damage Bear. Movement retains tree avoidance, and its walking animation plays only while it moves. Beyond 200 units of wrapped distance from its owner it stops attacking and returns; within 20 units it resumes hunting on its next decision. Beyond 500 pixels it immediately teleports to its owner, using wrapped distance in the forest. Enemies can target and damage Bear with melee and projectiles; death schedules full-health resurrection at the owner exactly five seconds later. A dead owner suspends hunting. Companion state is temporary, server-owned Player state, interpolated in snapshots and repositioned on area transfers; character saves continue to persist class progress, with fresh Druid progress added automatically to older saves.

Trees covering the local player's sprite fade to 15% opacity (85% transparent) in village and forest, then return to full opacity once the player moves clear or in front. Only the covering tree sprite fades; its collision and shadows remain unchanged.

Settings → Graphics includes **Waving grass and trees**, independent of grass density. Enabled by default and in Balanced/High, disabled in Low; the choice persists across reloads. Both areas use gentle, staggered foliage sway with fixed roots. Disabling it immediately restores static sprites. The shared Canvas 2D sprite draw applies a time-based horizontal shear without changing collisions, sorting, tree fading, or cached shadows. Browser checks cover movement in both areas, fixed roots, live toggling, presets, and persistence.

All interface and Canvas labels use bundled Alegreya Sans (regular, medium, bold and italic), distributed under the SIL Open Font License in `public/assets/fonts/OFL.txt`. [Font source](https://github.com/google/fonts/tree/main/ofl/alegreyasans).
