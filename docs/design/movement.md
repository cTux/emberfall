# Movement and prediction

Status: implemented. Covers movement in [SCENE-02](../specs/scenes-and-village.md#scene-02--world-geometry), combat input in [UI-02](../specs/interface-and-audio.md#ui-02--combat-controls), and network feedback in UI-03.

## Authority and timing

Local movement predicts immediately with the same scenery pass-through, bounds, and wrapping rules as the server. Numbered commands carry up to 50 ms of movement duration; the server consumes at most 50 ms per tick, acknowledges the exact sequence and consumed duration (including partial commands), and rejects stale area inputs. The client starts from that authoritative position and replays only unprocessed durations, never comparing its current position directly with an old server position. Queues are bounded; prediction stops extending after one second without acknowledgements. Browser stalls add at most 100 ms per update.

The underlying position always reconciles. Only the drawing offset has a two-unit tolerance: tiny differences do not visibly move the character; accumulated offsets between 2 and 20 units decay with a 120 ms time constant. Errors over 20 units, area changes and death snap. Drawing offsets obey map bounds and wrapping while passing through scenery, and walking animation follows local input. The camera and attachments follow the same displayed player. Remote players, enemies, remote projectiles and combat feedback retain their roughly 100 ms snapshot interpolation buffer. Local sword animations and sounds extrapolate the server swing phase between updates. Local mage fireballs and ranger arrows launch from the displayed player on that same clock, using shared target selection and projectile motion in forest and training combat. Automatic casts use server timestamps. Manual casts carry increasing request IDs plus the current area, class and aim; snapshots acknowledge processed IDs and identify the accepted attack, and projectiles carry that same ID. Confirmation preserves local flight and animation timing while correcting targets; rejection cancels predicted effects and restores the authoritative swing phase. The server validates cooldown, life, class, area and training proximity, and ignores duplicate requests. Each accepted projectile uses the request aim even if the cursor moves before the next combat tick. Visual projectiles do not deal damage or predict explosions; prediction stops after one second without a fresh snapshot and resets on death, class changes and area transfers. Only the server decides hits, damage, health, deaths and rewards. Network latency can still cause visual and authoritative positions to differ. Interactions still require server-validated proximity.

Older direction-only clients retain a 250 ms held-input timeout; a connection cannot switch input modes mid-session. Timed commands cannot accelerate simulation by sending a burst, and duplicate sequence numbers are ignored.

## Stale state and performance

Client rendering predicts local movement, sword presentation and local mage/ranger/druid projectile visuals; it does not run enemy pathfinding or authoritative combat simulation. After one second without a fresh snapshot, walking animation, local attack animations and slash sounds stop, and predicted projectiles clear. Paused scenes also suppress local attacks. Fresh snapshots resume prediction from the server's swing phase without replaying missed swings. Attacks spend no mana, so mana rollback is not needed. Druid visuals retain one projectile through server-confirmed bounces, without switching to delayed snapshot rendering at impact. Shared motion steers the visual while hit detection is disabled; only server snapshots update hit history. Damage, roots, death and rewards remain authoritative; no hit rewind is performed. Presentation optimization and diagnostics are described in [presentation design](presentation.md).

## Ownership

- [worlds.ts](../../packages/server/src/worlds.ts) owns timed command queues, per-tick budgets and acknowledgements.
- [simulation.ts](../../packages/common/src/simulation.ts) and [world.ts](../../packages/common/src/world.ts) own shared movement geometry and cast validation.
- [local-movement.ts](../../packages/client/src/local-movement.ts) replays unacknowledged input and smooths display offsets.
- [snapshots.ts](../../packages/client/src/snapshots.ts) buffers server snapshots and reconciles predicted attacks.
- [Arena.tsx](../../packages/client/src/Arena.tsx) gathers input and draws predicted/interpolated state.

## Verification

Use [local movement tests](../../packages/server/src/local-movement.test.ts), [local projectile tests](../../packages/server/src/local-projectiles.test.ts), [snapshot tests](../../packages/server/src/snapshots.test.ts), [browser prediction](../../tests/predictive-casting.spec.ts) and [browser snapshots](../../tests/snapshots.spec.ts). Exercise delayed, duplicate and stale commands, partial acknowledgements, seams, class changes, death, manual rejection and recovery.
