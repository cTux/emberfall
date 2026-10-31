# Parties and dimensions

[Back to Game runtime](../new-runtime.md).

## Parties and dimensions

The runtime owns temporary party membership, leader order and expiring requests.
Player payloads carry party, home-run and current-run IDs. Each run owns a separate
Miniplex player index and scene; the shared village training ticks once per world.
Projection chooses the viewer's run and filters remote forest occupants by run ID.
Party request visibility is private per viewer, so state broadcasts are per session.
Party commands use authenticated ownership and the existing chat rate limit.

Loot hints observe detached, authoritative local backpack totals in `Arena.tsx`.
The initial snapshot seeds a silent baseline; later positive item quantity deltas
create local presentation entries. This also covers gathering, trading and storage
receipts. Decreases and inventory rearrangement produce no hints. Entries use
monotonic client time, follow the reconciled local player in both scenes, and
expire after 2100 ms. The local preference clears entries while disabled and
continues updating the baseline to prevent replay. No save or wire schema changes
are required. Rendering reuses bundled item/plant art through native Pixi commands.
