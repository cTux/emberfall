---
name: emberfall-reconciliation
description: Diagnose or change Emberfall client-new prediction, snapshot interpolation, reconciliation and local effect alignment. Use for stale projectile origins, pickup destinations or movement desync; excludes combat balance, transport-only setup and sprite artwork alone.
---

# One displayed local pose

Read the [client guide](../../../packages/client-new/README.md),
[movement design](../../../docs/design/movement.md) and
[new-runtime design](../../../docs/design/new-runtime.md). Trace source timestamps
and ownership through `snapshots.ts`, `local-movement.ts`, `Arena.tsx` and
`presentation/world.ts` before assuming a network fault.

Keep three states distinct: immutable received snapshots, buffered remote
presentation, and the local reconciled pose. Camera, local body, aim, attachments
and newly adopted local effects must agree on that pose. Never mutate a received
snapshot or predict HP, XP, currency, damage, collection or death.

Keep the movement time accumulator monotonic: RAF timestamps can predate an input handler using performance.now(). A backward clock double-counts elapsed time and grows the input queue. Test interleaved timestamps over sustained movement.

Replay only unconsumed input duration, preserving sequence and epoch. Preserve
cast IDs through prediction and confirmation. Match sibling projectiles by
confirmed identity; adopting a late cast cannot duplicate a launch or replay
sound. Apply local prediction offset once when adopting a confirmed projectile,
using wrapped deltas. Retain distance already flown, heading and remaining range;
do not drag existing shots with the player or rewind late shots to the muzzle.

Pickup attraction uses the server-selected `collectorId`. Adjust only detached
render coordinates toward the recipient's displayed pose as the pickup approaches.
Do not choose a new recipient client-side or award anything locally. Unclaimed
and remote-targeted drops stay on their confirmed interpolation path.

Write discriminating regression cases before claiming a fix: forest and training,
both wrapped axes, delayed/partial/duplicate/out-of-order confirmations, manual
and automatic attacks, multiple projectiles, target changes, death/class/scene
reset, pauses, stale replies and reconnects as applicable. Assert source immutability,
unchanged rewards, no duplicates, continued flight and bounded prediction.
Existing entry points are `local-movement.test.ts`, `local-projectiles.test.ts`,
`snapshots.test.ts`, `pickup-presentation.test.ts` and `protocol.test.ts` under
`packages/server-new/src`. For wire changes verify native protocol round trips.

Build and run the affected real-Colyseus browser case, then inspect movement,
projectiles and pickups visually. Report which latencies and scenarios were
verified; passing finite tests cannot guarantee zero desync forever.
