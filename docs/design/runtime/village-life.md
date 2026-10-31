# Village residents, dialogue and ambient life

[Runtime design](../new-runtime.md).

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
See [SCENE-06](../../specs/scenes/village.md#scene-06--village-life) and
[CHAT-04](../../specs/worlds/chat.md#chat-04--npc-speech-and-silence) for timings,
free-route failover, visibility and recovery rules.
