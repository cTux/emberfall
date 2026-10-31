# Simulation and replication

[Back to Game runtime](../new-runtime.md).

## Simulation and replication

After authoritative forest combat (including kill credit and shared pickups),
`server/scenes.ts` applies `core/levelUp` to each player's level, XP and paragon.
The existing per-entity payload replicates these fields; prediction never grants
progress. Per-class saves include optional paragon, defaulted to zero on decode;
legacy levels above 20 are folded into paragon. Existing autosave, class-switch,
disconnect and shutdown writes retain all three fields. The client uses core's
`experienceRequired` formula and passes confirmed values to the controlled
PartyCard XP meter. No stat changes or progression prompts are introduced.

Gold collection adds one coin to the nearest living forest collector, once, in shared simulation. The live player `coins` field projects the account Storehouse balance. Version-2 saves persist that balance once outside class records, using the existing autosave lifecycle. The party HUD, Storehouse and trading UI receive the same confirmed balance.

Each party has one Miniplex simulation world. Components reference canonical
plain entities; ordered query views preserve targeting and spawn order even when
Miniplex removes an item by swapping it with the last item. Shared kernels consume
those views in both forest and training. Replacing a scene removes its components
and queries. Systems run on a fixed 50 ms tick; queued input cannot consume more
than that tick's movement budget.

Each connection has a private Colyseus session room. The shared party registry
owns gameplay, so browsing, password joins and world transfers preserve one SDK
connection and existing recovery behavior. This is intentionally a single-process
design, not a horizontally sharded room-per-world deployment.

`common/protocol` projects plain state into native Colyseus schema records.
Positions, angles and input acknowledgements use scalar deltas; the remaining
entity details use a per-entity payload. Collection membership and order are
explicit. A party broadcast is serialized once and applied to each session's
projection. The client reconstructs detached snapshots so later patches cannot
mutate interpolation history. Protocol versions are checked at room creation.

## Related runtime systems

- [Village residents and dialogue](village-life.md)
- [Native rendering and diagnostics](rendering.md)
