# Operational limits

[Back to Running, hosting and saves](../operations.md).

## Operational limits

The server owns positions at 20 Hz, normalizes diagonal movement, wraps positions at map edges, and clears stale input. Input/schema validation, payload and connection limits, bounded password-hashing concurrency, per-connection rate limits, slow-consumer eviction and heartbeat cleanup protect the basic protocol. Passwords use salted scrypt and never appear in world listings. Browser WebSocket origins are restricted to the configured client origin. Internet hosting should additionally enforce ingress/IP limits at the reverse proxy; per-connection limits do not stop reconnect-based abuse.

Rendering runs independently of React at the display frame rate. Forest combat uses up to 160 enemies per scene; red projectiles are capped at 160. Before adding large waves, profile the existing PixiJS renderer, spatial partitioning and Colyseus replication against an explicit enemy/player target. Preserve server authority and keep high-frequency entities out of React state.

A browser launch proves connectivity, not public reachability, persistence recovery or performance. Verify these separately. The GitHub Pages workflow deploys the static client only; backend deployment remains manual.

Sources: [server entrypoint](../../packages/server/src/index.ts), [HTTP/WebSocket server](../../packages/server/src/worlds.ts), [certificate setup](../../scripts/setup-https.ps1), [client build](../../packages/client/vite.config.ts), [character store](../../packages/server/src/characters.ts).
