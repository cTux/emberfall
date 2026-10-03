# Running, hosting and saves

Use Node 24, pnpm 11 and PowerShell 7. Install with `pnpm install --frozen-lockfile`. Run `pnpm dev` at https://localhost:5173; use a second isolated browser profile for another character. Production: `pnpm build` then `pnpm start`.

## HTTPS and connectivity

Production serves the built client and secure WebSocket endpoint together at https://localhost:3001. `pnpm dev` and `pnpm start` create a self-signed certificate in ignored `.certs/` if missing (PowerShell 7 required for generation). The certificate covers localhost and current LAN IPv4 addresses and lasts one year. Browsers show a warning until the public certificate is trusted; private keys must never be shared. The OS trust store is not modified. HTTP and HTTPS have separate browser storage, so a saved nickname/character token on the old HTTP origin does not automatically migrate.

For a temporary internet test, build and run `pnpm start`, reserve this PC's LAN address in the router, and forward **TCP 3001 → PC:3001**. Visitors open `https://PUBLIC_IP:3001`; both game traffic and files use that port, with no UDP or separate WebSocket port. Allow inbound TCP 3001 in Windows Firewall on the active network profile. Keep the Vite development port 5173 private. An alternative is external TCP 443 → PC:3001, then use `https://PUBLIC_IP`. External testing requires a public reachable address: CGNAT or upstream double NAT needs ISP/router changes or a tunnel. Test from mobile data, not from the same LAN. A local self-signed certificate causes a warning on other devices and does not cover a public IP; use a domain and publicly trusted certificate for regular hosting.

`PORT` and `HOST` configure the server. `TLS_CERT` and `TLS_KEY` accept certificate/key PEM paths for a trusted certificate. `HTTP_ONLY=1` explicitly disables backend TLS when using an HTTPS/WSS reverse proxy; do not expose that plaintext backend directly. Local HTTPS follows [Vite's server HTTPS configuration](https://vite.dev/config/server-options#server-https).

The production health endpoint is `/health`; WebSocket uses `/ws`. Default binding is `0.0.0.0:3001`. Development proxies `/ws` to the game server. See [development](development.md) for test configuration.

## Deployment and cache consistency

The HTTP server serves HTML and unversioned public assets with `Cache-Control: no-cache`, `version.json` with `no-store`, and content-hashed JS/CSS bundles with `public, max-age=31536000, immutable`. Vite separates dependencies into `vendors-[hash].js`; unchanged vendor content retains its filename while changed app code gets a new one. Deploy the client HTML, version file and hashed assets together as one release, retaining older hashed assets while existing clients may request them. Keep the SQLite database across deployments. Live scenes are deliberately not persisted; restarting returns recovered players to the village.

## Persistence and backup

The server uses Node 24's built-in SQLite database at `packages/server/data/characters.sqlite` in both development and production. `SAVE_PATH` overrides this path; keep it on persistent storage. Saves include name, level, XP, current/max HP and mana, and total time in worlds. World membership and position remain temporary. Saves happen on entry, every five seconds, on leave/disconnect, and on graceful shutdown; an abrupt process or machine failure can lose up to five seconds of recent changes. SQLite uses WAL and full synchronous writes. Stop the server before copying the database for backup, or use a SQLite-aware online backup that includes committed WAL data. Never put the database under the client public directory.

For a stopped-server backup, preserve the data directory before upgrading and restore only while stopped. Keep a compatible application build with the backup. Live scene restoration and account recovery are not implemented; see [characters](specs/characters.md).

## Operational limits

The server owns positions at 20 Hz, normalizes diagonal movement, wraps positions at map edges, and clears stale input. Input/schema validation, payload and connection limits, bounded password-hashing concurrency, per-connection rate limits, slow-consumer eviction and heartbeat cleanup protect the basic protocol. Passwords use salted scrypt and never appear in world listings. Same-origin browser WebSocket connections are enforced. Internet hosting should additionally enforce ingress/IP limits at the reverse proxy; per-connection limits do not stop reconnect-based abuse.

Rendering runs independently of React at the display frame rate. Forest combat uses up to 160 enemies per scene; red projectiles are capped at 160. Before adding large waves, profile a WebGL sprite batch renderer, spatial partitioning and compact/delta network snapshots against an explicit enemy/player target. Preserve server authority and keep high-frequency entities out of React state.

A browser launch proves connectivity, not public reachability, persistence recovery or performance. Verify these separately. No automated deployment pipeline or GitHub Actions workflow exists in the documented baseline.

Sources: [server entrypoint](../packages/server/src/index.ts), [HTTP/WebSocket server](../packages/server/src/worlds.ts), [certificate setup](../scripts/setup-https.ps1), [client build](../packages/client/vite.config.ts), [character store](../packages/server/src/characters.ts).
