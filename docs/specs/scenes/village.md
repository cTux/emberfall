# Village interactions and residents

[Back to Village and forest scenes](../scenes-and-village.md).

## SCENE-01 — Village and interactions

The lobby is a five-building village with a connected path network and a central square. Each building has a distinct generated design in the same wardrobe style and front-facing camera, preserving source proportions, world widths and ground positions. Players can walk through buildings and tall torch posts; interactions still require proximity to their entrances. Building interiors remain unimplemented; Marta and Bram provide shared item trading.

Seeded trees, mossy rocks and five plant kinds fill the surrounding village landscape.
Paths, building approaches, the central square and training clearings stay open.
Rocks and plants use the same wrapped scenery rendering as trees and remain pass-through
for players.

The create/join browser shows a forest backdrop; entering a world takes players to its village. E interacts within 68 units of a blue portal or building doorway. Buildings currently open service placeholders. All windows have a draggable title and close button; closed browser/death windows have a reopen control. Text selection is disabled throughout the game.

Hovering a functional building, NPC or item shows a thin yellow sprite outline (1 world unit) both within and outside interaction range. Names and nameplate backgrounds stay unchanged, without an `(E)` prefix. E or a left click activates the hovered target while in range; outside range neither activates it. E without a hovered target retains the nearby interaction. Decorative scenery has no interaction outline. Completed-forest return portals use the same feedback and input, including across wrapped seams.

In the new runtime, the Inn remains scenery without an interaction or nameplate. Marta the
Innkeeper starts beside its right wall and walks between village stops with pauses.
Oswin the Steward lives at the Hall, Bram the Craftsman at the Workshop, and Nell the
Pathfinder at the Lodge. Storehouse already provides storage and gets no extra resident.
Each resident has a name, personality and a home building. The server owns their
positions, walking state and conversations. Nearby players do not interrupt walking.
Marta and Bram pause while a living connected village player has their trading window open
and remains in interaction range. Closing the window, leaving range or the village,
dying or disconnecting releases that player's interaction; another active trader
can keep that merchant paused. E within 68 units opens their compact shared trading window, titled
with their name. Their names use the player's font, outline
and placement above the sprite, unchanged by hover or range. Marta sells consumables and resources; Bram sells gear. Both buy collected items; see CHAR-04 for the shared
stock, gold and transaction rules.

## SCENE-06 — Village life

Village cats use the same yellow hover outline, proximity check, E key and left-click
interaction as other functional objects. Petting a cat shows a local speech bubble
above its moving sprite, cycling through `Purrr`, `Meow`, `Mrrp`, `Mew`, `Prrrt`
and `Mrrrow`. Each cat responds at most
once every two seconds; its bubble lasts two seconds. Living village players can
also pet a nearby cat with E when nothing is hovered. Cat speech opens no window,
also appears once as `Cat` in the petting player’s village chat log and resets
when leaving the world. Replies stay local and share the chat panel’s ten-message limit.

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
Replies do not reset these automatic-start intervals. The prompt requests one short
line of at most 120 characters, without quotation marks, grounded in Emberfall's fantasy
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

Residents have consistent personal backgrounds covering their work, past experience,
dreams, interests, relationships and worries. Automatic conversations select from
32 topics, including work, childhood, mentors, travel, ambitions, hobbies, food,
friendship, fears, achievements, nature and village traditions. Each resident uses
every topic in a random order before starting a new rotation, with no immediate
repeat between rotations. NPC follow-ups keep the opening topic; directed player
replies answer the player's words first. Recent lines discourage repeated phrasing.
Backgrounds and topics guide generated speech rather than supplying scripted lines.
