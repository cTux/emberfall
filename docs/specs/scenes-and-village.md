# Village and forest scenes

Status: implemented baseline. Goal: Stage a party in the village and run one cooperative Forest encounter with Easy, Medium or Hard difficulty per world. See [technical design](../design/simulation.md).

## SCENE-01 — Village and interactions

The lobby is a five-building village with a connected path network and a central square. Buildings use the original Ninja Adventure house tileset. Players can walk through buildings and tall torch posts; interactions still require proximity to their entrances. Building interiors remain unimplemented; Marta provides shared item trading.

Seeded trees, mossy rocks and five plant kinds fill the surrounding village landscape.
Paths, building approaches, the central square and training clearings stay open.
Rocks and plants use the same wrapped scenery rendering as trees and remain pass-through
for players.

The create/join browser shows a forest backdrop; entering a world takes players to its village. E interacts within 68 units of a blue portal or building doorway. Buildings currently open service placeholders. All windows have a draggable title and close button; closed browser/death windows have a reopen control. Text selection is disabled throughout the game.

Hovering a functional building, NPC or item shows a yellow sprite outline: thick (3 world units) within interaction range and thin (1 world unit) outside it. Names and nameplate backgrounds stay unchanged, without an `(E)` prefix. E or a left click activates the hovered target while in range; outside range neither activates it. E without a hovered target retains the nearby interaction. Decorative scenery has no interaction outline. Completed-forest return portals use the same feedback and input, including across wrapped seams.

In the new runtime, the Inn remains scenery without an interaction or nameplate. Marta the
Innkeeper starts beside its right wall and walks between village stops with pauses.
Oswin the Steward lives at the Hall, Bram the Craftsman at the Workshop, and Nell the
Pathfinder at the Lodge. Storehouse already provides storage and gets no extra resident.
Each resident has a name, personality and a home building. The server owns their
positions, walking state and conversations. Nearby players do not interrupt walking.
Marta pauses while a living connected village player has her trading window open
and remains in interaction range. Closing the window, leaving range or the village,
dying or disconnecting releases that player's interaction; another active trader
can keep her paused. E within 68 units opens her compact shared trading window, titled
with her name. Her name uses the player's font, outline
and placement above the sprite, unchanged by hover or range. Marta sells consumables and buys collected items; see CHAR-04 for the shared
stock, gold and transaction rules.

## SCENE-06 — Village life

Residents walk at 38 world units/second between independently chosen shared village stops,
avoiding their previous stop and preferring destinations not already chosen by another resident.
They pause independently for 5–9 seconds initially and at stops, and stop walking while conversing. Movement uses wrapped
geometry. Village life pauses when no living connected village players remain.
NPCs never follow players into the forest. Positions, memory, speech and debuffs
are temporary per-world state, reset when the world empties or the server restarts.
Marta retains her original idle art and uses a directional walking sheet; the other
residents reuse existing character art with distinct names.

Each resident has two outdoor workstations beside their home: Marta cooks and brews,
Oswin mixes remedies and keeps records, Bram forges and smelts, and Nell practices
archery and works leather. After 25–45 seconds of wandering, residents return to
their next workstation, alternating between their two jobs. On arrival they face
the equipment and animate working for 60–90 seconds of active work before wandering
again. Player trading and directed speech, pending conversations and visible replies
replace the work pose with the regular talking/idle pose. Work resumes at the same
station with its remaining duration when conversation ends. Empty-village time does
not consume work time. Workstations are scenery and grant no items or combat damage.

Work feedback uses distinct particles at each functional item: cooking steam,
amber brewing bubbles, green/lilac alchemy motes, ink flecks at the records desk,
impact sparks at the anvil, rising furnace embers, practice-shot motes and target
straw dust, and falling leather shavings. Ambient particles controls these effects.
They appear only during active work, inherit scenery fading, and stay anchored
when the camera crosses a world seam; they never create combat projectiles.

A resident can greet a living connected player within 120 units or start a short
exchange with another resident within 160 units. Automatic starts wait at least
90 seconds per village, 180 seconds per NPC, and 240 seconds per greeted player
across residents, with the first start eligible ten seconds after world creation.
Replies do not reset these automatic-start intervals. Speech is one short line of
at most 120 characters, without quotation marks, grounded in Emberfall's fantasy
setting and implemented game activities. Each resident has a distinct voice that
shapes greetings, player replies and NPC banter: Marta uses affectionate teasing
and food metaphors; Oswin treats tiny problems as solemn bureaucratic business;
Bram offers overconfident fixes and terrible tool puns; Nell delivers deadpan
woodland observations and tall tales. Humor is the default tone, with a playful
twist in most lines, direct answers to questions and varied jokes rather than
repeating catchphrases. Banter stays friendly and in the fantasy setting.
References to residents use `@Name`. Replies to player mentions and NPC exchanges
wait at least two seconds after the triggering message before generation starts,
subject to model availability. NPC exchanges stop after at most five messages total. An automatic NPC-to-NPC
greeting also receives one answer if it contains no mention. Continued exchanges
require another mention. Distant residents do not answer across the village.
Players can address a resident by mentioning their first name anywhere in chat,
with or without `@`, such as `Hello, @Marta!` or `Any advice, Marta?`. Matching
ignores case and requires a whole name. The first mentioned resident within 120
wrapped units answers the player's full message; distant residents are skipped.
Directed replies have a separate 10-second player cooldown and a five-second village reply interval. One request
runs per world, with at most two across the server and no unbounded request queue.
Each NPC remembers at most six recent spoken lines. No NPC dialogue grants items,
changes gold, creates quests or implements services in placeholder buildings.

## SCENE-02 — World geometry

The lobby and generated forest are each 4800×2560 and wrap on all four edges. The lobby is 20 times its original area (five times the width and four times the height). Its camera always centers the local character, including while training or crossing an edge; terrain, scenery, players, companions, combat effects, cursor aim, and navigation use the nearest wrapped positions. The original village buildings, wardrobe, portal, and training dummies keep their positions, with extra terrain and vegetation around them. Both areas share the same dimensions so combat and interpolation use the same wrapped distances. Tree generation and nearby-cell collision queries are shared; combat distances and client interpolation also wrap.

Players move through scenery in both areas; enemies and companions retain tree steering and collision. WASD or arrows move at 180 world units/second with normalized diagonal speed.

## SCENE-03 — Voting and entry

The village portal offers Forest with Easy (default), Medium and Hard difficulties. The registered difficulty multipliers (1×, 2× and 4× respectively) scale enemy health and damage, including elites and the boss, before party health scaling. The selected difficulty is submitted to the server and shown in the departure vote. Creating allocates a server-owned scene before entry. All current world members must vote ready, including sessions retained during the disconnect grace period; unanimous readiness starts a five-second countdown. Retracting a vote cancels it. Joins invalidate unanimity; departures restart the countdown with the remaining electorate. At completion, the server teleports the party together and starts a 120-second run. Players may join a world at any time, subject to its password and capacity. Late joiners arrive in the village and can use its portal to join the active scene; players who return early can rejoin the same way. Joining uses the existing scene and deadline, including while the boss is alive. An unfinished scene stays joinable even when every participant returns to the village. Once the boss dies and return portals open, entry is closed; no living players may remain inside before a new scene can be created. One scene per world is supported, and an empty world resets its scene. Party members in another dimension use 40% opacity (60% transparency); members in the same dimension remain fully opaque.

Clicking I'm ready closes the portal dialog; the Portal vote button reopens it to retract. The five-second departure countdown displays large gold digits that grow and fade each second, with animation disabled for reduced-motion preferences. Regular enemy spawning continues through the boss encounter; boss death alone completes the scene and clears hostiles.

## SCENE-04 — Pause and regeneration

When no living players remain in a generated scene (everyone died or left; interrupted connections retain membership during the existing recovery window), combat and scene time pause. Enemies, projectiles, spawn warnings, debuffs, loot expiry, and companion actions wait; rejoining resumes their remaining durations and the boss timer. Living village players do not keep the forest running. The village portal still allows rejoining an unfinished scene and also offers Regenerate scene while no living players are inside. The active scene's Regenerate scene button preserves its difficulty. Regeneration replaces the old scene with a fresh departure vote and returns any dead participants to the village with restored stats. The server rejects regeneration during voting/countdown or while even one living player remains inside.

## SCENE-05 — Boss and return

At timer expiry, regular spawning continues and one Brute Boss with 300 Easy HP before party scaling with an orange health bar appears. The scene stays active until the boss dies; only then do remaining enemies disappear and a fixed blue return portal appears at each participant's feet, including players far from the original clearing. E near it returns a player to the village. A dead player can return immediately using their death window while teammates continue. Escape opens a confirmation: leaving a scene returns to the village without removing party membership; leaving the village exits the world. Escape while a modal is open closes that window first.

## Acceptance

- Every current party member must be ready; retracting cancels departure, joining invalidates unanimity and departures restart the five-second countdown.
- Enter together, or join the active scene late without resetting its deadline. Boss defeat closes entry.
- Cross all four seams in village and forest: player, camera, aim, scenery and navigation stay aligned.
- Pause an empty/dead scene, advance the test clock, then rejoin: its remaining timers resume rather than expiring during the pause.
- Regeneration rejects a scene with a living participant and rejects voting/countdown; eligible regeneration restores dead participants and starts a new vote.
- After 120 seconds the boss spawns; regular spawning continues until boss death. Each participant receives a fixed nearby return portal.
- Early scene exit retains world membership; village exit removes it. Buildings remain service placeholders.

Evidence: [scenes.test.ts](../../packages/server/src/scenes.test.ts), [pass-through.test.ts](../../packages/server/src/pass-through.test.ts), [village.test.ts](../../packages/server/src/village.test.ts).
