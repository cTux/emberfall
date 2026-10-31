# Chat, speech and NPC dialogue

[Back to Worlds and chat](../worlds-and-chat.md).

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

Evidence: [Ollama provider](../../../packages/server/src/npc-models.test.ts),
[village movement](../../../packages/server/src/npcs.test.ts),
[reply scheduling](../../../packages/server/src/npc-reply-scheduling.test.ts),
[outage recovery](../../../packages/server/src/npc-outages.test.ts),
[dimension filtering](../../../packages/server/src/npc-chat.test.ts),
[browser presentation](../../../tests/npcs.spec.ts).
