# Village and forest scenes

Status: implemented baseline. Goal: Stage a party in the village and run one cooperative Forest / Easy encounter per world. See [technical design](../design/simulation.md).

## SCENE-01 — Village and interactions

The lobby is a five-building village with a connected path network and a central square. Buildings use the original Ninja Adventure house tileset. Players can walk through buildings and tall torch posts; interactions still require proximity to their entrances. Building interiors and services are intentionally not implemented yet.

The create/join browser shows a forest backdrop; entering a world takes players to its village. E interacts within 68 units of a blue portal or building doorway, with an in-range nameplate. Buildings currently open service placeholders. All windows have a draggable title and close button; closed browser/death windows have a reopen control. Text selection is disabled throughout the game.

Lobby buildings and portals show interaction availability directly in their existing nameplate: a lighter background and `(E) Building name` while in range. They no longer show a separate tooltip.

In the new runtime, the Inn remains scenery without an interaction or nameplate. Marta the
Innkeeper stands right beside its right wall, facing forward with a looping idle animation and
no movement. E within 68 units opens the same service placeholder window used
by other buildings, titled with her name. Her nameplate shows availability in
the same way. Accepted future scope: Marta will sell consumables and buy items
collected in battle; trading and its economy are not implemented yet.

## SCENE-02 — World geometry

The lobby and generated forest are each 4800×2560 and wrap on all four edges. The lobby is 20 times its original area (five times the width and four times the height). Its camera always centers the local character, including while training or crossing an edge; terrain, scenery, players, companions, combat effects, cursor aim, and navigation use the nearest wrapped positions. The original village buildings, wardrobe, portal, and training dummies keep their positions, with extra terrain and vegetation around them. Both areas share the same dimensions so combat and interpolation use the same wrapped distances. Tree generation and nearby-cell collision queries are shared; combat distances and client interpolation also wrap.

Players move through scenery in both areas; enemies and companions retain tree steering and collision. WASD or arrows move at 180 world units/second with normalized diagonal speed.

## SCENE-03 — Voting and entry

The village portal offers Forest / Easy. Creating allocates a server-owned scene before entry. All current world members must vote ready, including sessions retained during the disconnect grace period; unanimous readiness starts a five-second countdown. Retracting a vote cancels it. Joins invalidate unanimity; departures restart the countdown with the remaining electorate. At completion, the server teleports the party together and starts a 120-second run. Players may join a world at any time, subject to its password and capacity. Late joiners arrive in the village and can use its portal to join the active scene; players who return early can rejoin the same way. Joining uses the existing scene and deadline, including while the boss is alive. An unfinished scene stays joinable even when every participant returns to the village. Once the boss dies and return portals open, entry is closed; no living players may remain inside before a new scene can be created. One scene per world is supported, and an empty world resets its scene. Party members in another dimension use 40% opacity (60% transparency); members in the same dimension remain fully opaque.

Clicking I'm ready closes the portal dialog; the Portal vote button reopens it to retract. The five-second departure countdown displays large gold digits that grow and fade each second, with animation disabled for reduced-motion preferences. Regular enemy spawning continues through the boss encounter; boss death alone completes the scene and clears hostiles.

## SCENE-04 — Pause and regeneration

When no living players remain in a generated scene (everyone died or left; interrupted connections retain membership during the existing recovery window), combat and scene time pause. Enemies, projectiles, spawn warnings, debuffs, loot expiry, and companion actions wait; rejoining resumes their remaining durations and the boss timer. Living village players do not keep the forest running. The village portal still allows rejoining an unfinished scene and also offers Regenerate scene while no living players are inside. Regeneration replaces the old scene with a fresh departure vote and returns any dead participants to the village with restored stats. The server rejects regeneration during voting/countdown or while even one living player remains inside.

## SCENE-05 — Boss and return

At timer expiry, regular spawning continues and one boss with 200 base HP before party scaling with an orange health bar appears. The scene stays active until the boss dies; only then do remaining enemies disappear and a fixed blue return portal appears at each participant's feet, including players far from the original clearing. E near it returns a player to the village. A dead player can return immediately using their death window while teammates continue. Escape opens a confirmation: leaving a scene returns to the village without removing party membership; leaving the village exits the world. Escape while a modal is open closes that window first.

## Acceptance

- Every current party member must be ready; retracting cancels departure, joining invalidates unanimity and departures restart the five-second countdown.
- Enter together, or join the active scene late without resetting its deadline. Boss defeat closes entry.
- Cross all four seams in village and forest: player, camera, aim, scenery and navigation stay aligned.
- Pause an empty/dead scene, advance the test clock, then rejoin: its remaining timers resume rather than expiring during the pause.
- Regeneration rejects a scene with a living participant and rejects voting/countdown; eligible regeneration restores dead participants and starts a new vote.
- After 120 seconds the boss spawns; regular spawning continues until boss death. Each participant receives a fixed nearby return portal.
- Early scene exit retains world membership; village exit removes it. Buildings remain service placeholders.

Evidence: [scenes.test.ts](../../packages/server/src/scenes.test.ts), [pass-through.test.ts](../../packages/server/src/pass-through.test.ts), [village.test.ts](../../packages/server/src/village.test.ts), [portal.spec.ts](../../tests/portal.spec.ts), [lobby-camera.spec.ts](../../tests/lobby-camera.spec.ts).
