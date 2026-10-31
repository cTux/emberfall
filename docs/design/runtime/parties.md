# Parties and dimensions

[Back to Game runtime](../new-runtime.md).

## Parties and dimensions

The runtime owns temporary party membership, leader order and expiring requests.
Player payloads carry party, home-run and current-run IDs. Each run owns a separate
Miniplex player index and scene; the shared village training ticks once per world.
Projection chooses the viewer's run and filters remote forest occupants by run ID.
Party request visibility is private per viewer, so state broadcasts are per session.
Party commands use authenticated ownership and the existing chat rate limit.
