# Worlds and chat

Status: implemented baseline. Goal: Let up to eight players find a world, stay together, and communicate across its village and forest. See [technical design](../design/network-and-persistence.md).

## WORLD-01 — Discovery and membership

Worlds are public in the server directory, optionally password protected, and limited to 8 players. The server creates an unlocked "New Permanent World" on first startup, visible and joinable through the normal world browser without a password. It retains its UUID when empty and across restarts; its host label and scene reset on the last departure, and its next player receives the host label. Creation joins the creator. A host leaving transfers the host label to the next player. Explicit leave removes the player immediately and clears automatic recovery; the final departure removes player-created worlds. Interrupted connections and browser navigation retain the player and world for 30 seconds, including position, portal vote and forest membership. The client retries immediately after a failed connection or interruption, then once per second after repeated connection failures. It authenticates with its existing character key to resume without a password prompt. Movement input is cleared on interruption. The shared world continues running during recovery. Expired sessions are saved and removed by the next five-second autosave pass. World UUIDs, names, password hashes and each character's most recent authorized world are stored in the character SQLite database. Shutdown preserves world records. Restarting resets temporary scenes, positions and chat; recovery then rejoins the same world in its village with saved character progress. Recovery rejects another live session, an unauthorized character, a full world or a deleted world. If unavailable, the client shows an error and the world browser. There are no login accounts, private/unlisted worlds or ownership privileges.

## WORLD-02 — Client updates

Every production client build embeds a unique build ID and emits matching `version.json`. Before resuming gameplay on each WebSocket connection, the client requests that file with `cache: no-store`. Failed, malformed or timed-out checks retry the connection; a different build ID reloads the page. The current world UUID is saved in per-tab `sessionStorage` on successful join, restored on page load and cleared on explicit leave or rejected recovery. The character key remains in `localStorage`. Browsers with disabled storage can recover within the current page, but cannot guarantee recovery across reloads.

## CHAT-01 — Conversation and input focus

The chat panel shows the latest 10 messages in the current world, shared across village and forest players. Press Enter to activate chat and focus its input, or hover over the panel and click the input. Press Enter or Send to send a message; sending releases chat and input focus when the panel is not hovered. Hover never takes keyboard focus. The panel stays active while focused; Escape releases the input and movement keys do not move the player while typing. Touch devices show the input without hover.

## CHAT-02 — System announcements

The server adds `System` messages when a player joins or disconnects, dies, enters a scene (everyone became stronger), or leaves a scene (everyone became weaker). Countdown departures announce each player, and scene regeneration announces any returned players. Interrupted connections announce disconnection immediately and joining on successful resume; scene membership remains unchanged during the recovery window, so a scene departure is announced only if recovery expires. System messages share the 10-message limit and world isolation, use an empty player ID, and never replace player speech bubbles or consume a player's chat cooldown. Death is announced once per living-to-dead transition; dead players remain scene members until they leave.

## CHAT-03 — Speech bubbles and validation

Each player displays only their latest message in a wrapped speech bubble above their head in both scenes, until they send another message or leave the world. The server validates trimmed, nonempty text up to 200 characters, rejects control characters, identifies the sender from their session, and allows one message per 500 ms. Messages and bubbles travel in existing world snapshots, are isolated by world, survive reconnects and scene changes, and reset when the world empties. Chat is not saved with character progress.

## Acceptance

- Creating joins the creator; wrong passwords and full worlds reject entry. Other worlds receive no state or chat.
- Leaving transfers the host label; the last departure removes a player-created world but preserves the permanent world.
- Resume within the grace period without duplicating the player or losing position, vote or scene. After server restart, authorized recovery enters the village.
- Explicit leave revokes recovery. Failed build checks retry; changed build IDs reload before gameplay resumes.
- Typing never moves the character. Invalid or rate-limited chat is rejected; only the newest ten messages remain.
- System messages do not overwrite speech bubbles or consume player chat cooldowns.

Evidence: [worlds.test.ts](../../packages/server/src/worlds.test.ts), [reconnect.test.ts](../../packages/server/src/reconnect.test.ts), [update-recovery.test.ts](../../packages/server/src/update-recovery.test.ts), [chat.test.ts](../../packages/server/src/chat.test.ts), [chat.spec.ts](../../tests/chat.spec.ts).
