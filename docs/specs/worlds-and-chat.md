# Worlds and chat

Status: implemented baseline. Goal: Let up to 32 players find a world, stay together, and communicate across its village and forest. See [technical design](../design/network-and-persistence.md).

## WORLD-01 — Discovery and membership

Worlds are public in the server directory, optionally password protected, and limited to 8 players, except the permanent playtest world which permits 32. The browser presents a server table with Name, Latency and Players columns, without a "Playing as" line. Clicking anywhere in an available server row joins that world; the name button also supports keyboard activation. Full worlds and disabled joining prevent activation across the entire row. World creation is disabled in the browser. The server creates an unlocked "Playtest Default" on first startup, visible and joinable through the normal world browser without a password. Existing permanent worlds are renamed on startup while retaining their UUID and recovery records. It retains its UUID when empty and across restarts; its host label and scene reset on the last departure, and its next player receives the host label. Creation joins the creator. A host leaving transfers the host label to the next player. Explicit leave removes the player immediately and clears automatic recovery; the final departure removes player-created worlds. In the new runtime, interrupted connections and browser navigation retain the player and world for 10 seconds, including position, portal vote and forest membership. During this grace period the player has a Reconnecting status debuff and red sprite tint, cannot move or attack, and cannot be targeted or hit by enemies. Successful recovery clears the debuff and tint. The client retries immediately after a failed connection or interruption, then once per second after repeated connection failures. It authenticates with its existing character key to resume without a password prompt. Movement input is cleared on interruption. The shared world continues running during recovery. New-runtime sessions are saved and removed when the 10-second grace period expires; failed saves retain the player for an autosave retry. World UUIDs, names, password hashes and each character's most recent authorized world are stored in the character SQLite database. Shutdown preserves world records. Restarting resets temporary scenes, positions and chat; recovery then rejoins the same world in its village with saved character progress. Recovery rejects another live session, an unauthorized character, a full world or a deleted world. If unavailable, the client shows an error and the world browser. Steam accounts provide identity; there are no private/unlisted worlds or ownership privileges.

## WORLD-02 — Client updates

Every production client build embeds a unique build ID and emits matching `version.json`. Before resuming gameplay on each WebSocket connection, the client requests that file with `cache: no-store`. Failed, malformed or timed-out checks retry the connection; a different build ID reloads the page. The current world UUID is saved in per-tab `sessionStorage` on successful join, restored on page load and cleared on explicit leave or rejected recovery. Production character identity belongs to the Steam account; the HttpOnly login session authorizes recovery. Browsers with disabled storage can recover within the current page, but cannot guarantee recovery across reloads.

## CHAT-01 — Conversation and input focus

Chat inherits the shared game-window surface, typography and themed input/Send controls. On hover-capable devices, its frame and background disappear when neither hovered nor focused; touch devices keep the surface and input visible.

The chat panel shows the latest 10 messages in the current world, shared across village and forest players. Press Enter to activate chat and focus its input, or hover over the panel and click the input. Press Enter or Send to send a message; sending releases chat and input focus when the panel is not hovered. Hover never takes keyboard focus. The panel stays active while focused; Escape releases the input and movement keys do not move the player while typing. Touch devices show the input without hover.

## CHAT-02 — System announcements

The server adds `System` messages when a player joins or disconnects, dies, enters a scene (everyone became stronger), or leaves a scene (everyone became weaker). Countdown departures announce each player, and scene regeneration announces any returned players. In the new runtime, interrupted connections announce disconnection only after the 10-second recovery window expires; a successful resume produces no departure or new join announcement. Scene membership remains unchanged during recovery, so a scene departure is announced only if recovery expires. System messages share the 10-message limit and world isolation, use an empty player ID, and never replace player speech bubbles or consume a player's chat cooldown. Death is announced once per living-to-dead transition; dead players remain scene members until they leave.

All player-facing errors appear only as private `System` messages in chat, including account, nickname, world entry, gameplay, storage, connection and content-loading failures. Chat remains visible before joining and while dialogs are open; sending requires a connected world. Errors share the ten-message limit, never go to other players or speech bubbles, and are not repeated as banners or dialog alerts. Retry and Reload controls remain available in their original screens.

## CHAT-03 — Speech bubbles and validation

Speech bubbles use compact 10-unit text with 13-unit line spacing and size to their content so messages leave more of the world visible. This presentation is shared by player and NPC bubbles. Speech bubbles wrap at word boundaries; a single oversized word stays intact and the bubble expands to contain it. Each player displays only their latest message in a wrapped, rounded rectangular speech bubble with no bottom triangle, centered two world units above their health bar in both scenes and drawn over the debuff area, until they send another message or leave the world. The server validates trimmed, nonempty text up to 200 characters, rejects control characters, identifies the sender from their session, and allows one message per 500 ms. Messages and bubbles travel in existing world snapshots, are isolated by world, survive reconnects and scene changes, and reset when the world empties. Chat is not saved with character progress.

## CHAT-04 — NPC speech and silence

All NPC speech appears in chat for players in the NPC's dimension of the same
world, including distant listeners. Nearby range controls conversation starts,
not who can hear. Player chat and existing system announcements remain world-wide.
The server filters dimension-specific messages before replication; the client also
filters during scene transitions. A bounded 30-message world buffer supplies the
latest ten visible messages. NPC speech has its own identity, leaves player speech
bubbles/cooldowns intact, and has a ten-second NPC bubble.

The server calls a local Ollama instance through its native `/api/chat` endpoint,
using `stream: false`. The default address is `http://127.0.0.1:11434` and the
default model is `llama3.2:3b`; server-only `OLLAMA_BASE_URL` and `OLLAMA_MODEL`
override them. Cloud model tags are rejected; no external or paid fallback is
used. The Ollama service must also have cloud features disabled with
`OLLAMA_NO_CLOUD=1`. Requests time out after 60 seconds to allow cold model loading,
responses are bounded to 32 KiB. The prompt requests at most 120 characters, but
valid replies are displayed in full rather than cut mid-sentence. Spoken text is
bounded to 32,768 characters, including for injected dialogue providers, without
control/format characters. The adapter folds line breaks and tabs into spaces
and strips quotation marks while preserving apostrophes inside words;
it never invents fallback dialogue. Other control/format characters and
empty text remain invalid. Chat messages remain readable when partially visible
or taller than the scroll area; players can scroll to read the full reply.
HTTP errors, timeouts and invalid answers mark the
provider unavailable for 60 seconds; Retry-After is honored from 30 seconds up to
15 minutes. At most two requests run concurrently across worlds. A saturated
local request budget defers speech without silence.

When the configured model fails or the provider is cooling down, all residents in the affected
village receive Silenced: the shared framed Silence ailment icon (12 world units,
2-unit row spacing, no stack count) in the standard overhead debuff row, plus
a red name. The icon uses the same renderer and assets as bleeding and other
ailments. Silence is a shared non-damaging debuff kind, ready for future player
use; player silence application and spell restrictions are not implemented here.
One red System message announces the outage to village listeners. Silenced NPCs
continue walking, emit no fallback dialogue, and retry eligible conversations no
more than once per minute. A successful response removes silence from all residents
and adds one recovery System message. Failures do not repeatedly announce silence.
Late answers are discarded after disposal or when participants leave range or the
dimension. No model call blocks simulation, and requests are aborted on world reset
or shutdown.

Evidence: [Ollama provider](../../packages/server/src/npc-models.test.ts),
[village movement](../../packages/server/src/npcs.test.ts),
[reply scheduling](../../packages/server/src/npc-reply-scheduling.test.ts),
[outage recovery](../../packages/server/src/npc-outages.test.ts),
[dimension filtering](../../packages/server/src/npc-chat.test.ts),
[browser presentation](../../tests/npcs.spec.ts).

## Acceptance

- Creating joins the creator; wrong passwords and full worlds reject entry. Other worlds receive no state or chat.
- Leaving transfers the host label; the last departure removes a player-created world but preserves the permanent world.
- On interruption, immediately show the world browser's server list, close gameplay dialogs and clear the displayed world while preserving the recovery target. Resume automatically when the server is available, without duplicating the player or losing position, vote or scene within the grace period. After server restart, authorized recovery enters the village.
- Explicit leave revokes recovery. Failed build checks retry; changed build IDs reload before gameplay resumes.
- Typing never moves the character. Invalid or rate-limited chat is rejected; only the newest ten messages remain.
- System messages do not overwrite speech bubbles or consume player chat cooldowns.

Evidence: [worlds.test.ts](../../packages/server/src/worlds.test.ts), [reconnect.test.ts](../../packages/server/src/reconnect.test.ts), [update-recovery.test.ts](../../packages/server/src/update-recovery.test.ts), [chat.test.ts](../../packages/server/src/chat.test.ts), [client recovery](../../tests/reconnect.spec.ts), [Steam recovery](../../tests/accounts.spec.ts).

## PARTY-01 — Explicit parties

World entry is ungrouped. Parties have at most four members. Two ungrouped players
form a party when an invitation is accepted; the inviter leads. Only leaders invite
or approve join requests. Targeting another member sends the request to the leader.
Nearby players offer E Invite to party, Join party or Accept using wrapped interaction
range. Pending requesters have a thin blue outline visible only to the recipient.
Requests expire after 30 seconds, are rate limited, and cannot switch existing
members between parties. Commands /party @name and /accept [@name] work world-wide;
/accept without a name requires exactly one request. /leave leaves the party and
returns the departing player to the village. Relevant players receive yellow System
messages for requests and command results. Leadership transfers to the oldest member
on departure, after the reconnect grace period. One remaining member dissolves the
party while retaining their dimension. Parties are temporary world-session state.

Only leaders (or ungrouped players) create dimensions. Existing voting/countdowns
apply to all party members, including members currently in another run. Such members
must return before voting. Different parties and solo players have independent runs
and forest resources. Joining during a run never teleports the new member; they may
enter through the village portal later. Combat, scaling and rewards use actual
dimension occupants. Party cards and leader crowns show actual membership.

Nicknames contain 3–12 ASCII letters, digits or underscores. Existing invalid
nicknames require a rename before world entry; saved identity/progress is retained.
