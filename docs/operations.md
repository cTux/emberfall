# Running, hosting and saves

Use Node 24, pnpm 11 and PowerShell 7. Install with `pnpm install --frozen-lockfile`. Run `pnpm dev` at https://localhost:5173; use a second isolated browser profile for another character. Production: `pnpm build` then `pnpm start`.

## Steam login (new runtime)

The new runtime requires Steam login. Before `pnpm dev-new` or `pnpm start-new`,
set `STEAM_ORIGIN` to the exact browser HTTPS origin (no path/trailing slash) and
`STEAM_WEB_API_KEY` to a server-held [Steam Web API key](https://steamcommunity.com/dev/apikey).
Use `https://localhost:5174` for Vite development or the public HTTPS origin for
production. The callback is `STEAM_ORIGIN/auth/steam/callback`. Turbo passes these
variables to the server; do not use a `VITE_` prefix for the API key. Missing
configuration stops startup rather than enabling guest access.

New production serves both HTTP routes and Colyseus traffic on 3003. Proxy `/auth`,
`/api`, matchmaking and WebSocket traffic to that server, keep the browser on the
configured origin, and use publicly trusted HTTPS for public login. `HTTP_ONLY=1`
is supported only behind the HTTPS proxy. Vite proxies auth/account routes during
development. Keep the host clock synchronized for signed-response expiry checks.

Back up the stopped new-runtime SQLite database before rollout. New account/session
tables are additive; existing browser characters are preserved but Steam users
start fresh. No save linking is performed. Accounts and game nicknames persist on
the server; the seven-day login cookie is not the save identity. Sign in again to
recover the same Steam character on another browser. Logout revokes the current
session and disconnects its game connection.

Deploy matching client/server bundles together. For rollback, stop the server and
restore the pre-rollout database backup with the previous build; retain a separate
post-rollout backup so new Steam progress is not destroyed. Do not expose the
legacy-protocol test factory as an alternative public entrypoint.

Verification requires a real Steam round trip on the configured public origin,
first nickname confirmation, Settings → Account rename, logout and another-device
login. Automated tests mock Steam and do not prove deployment credentials or public
callback reachability. See [account design](design/steam-accounts.md).

## HTTPS and connectivity

Production serves the built client and secure WebSocket endpoint together at https://localhost:3001. `pnpm dev` and `pnpm start` create a self-signed certificate in ignored `.certs/` if missing (PowerShell 7 required for generation). The certificate covers localhost and current LAN IPv4 addresses and lasts one year. Browsers show a warning until the public certificate is trusted; private keys must never be shared. The OS trust store is not modified. HTTP and HTTPS have separate browser storage, so a saved nickname/character token on the old HTTP origin does not automatically migrate.

For a temporary internet test, build and run `pnpm start`, reserve this PC's LAN address in the router, and forward **TCP 3001 → PC:3001**. Visitors open `https://PUBLIC_IP:3001`; both game traffic and files use that port, with no UDP or separate WebSocket port. Allow inbound TCP 3001 in Windows Firewall on the active network profile. Keep the Vite development port 5173 private. An alternative is external TCP 443 → PC:3001, then use `https://PUBLIC_IP`. External testing requires a public reachable address: CGNAT or upstream double NAT needs ISP/router changes or a tunnel. Test from mobile data, not from the same LAN. A local self-signed certificate causes a warning on other devices and does not cover a public IP; use a domain and publicly trusted certificate for regular hosting.

`PORT` and `HOST` configure the server. `TLS_CERT` and `TLS_KEY` accept certificate/key PEM paths for a trusted certificate. `HTTP_ONLY=1` explicitly disables backend TLS when using an HTTPS/WSS reverse proxy; do not expose that plaintext backend directly. Local HTTPS follows [Vite's server HTTPS configuration](https://vite.dev/config/server-options#server-https).

The production health endpoint is `/health`; WebSocket uses `/ws`. Default binding is `0.0.0.0:3001`. Development proxies `/ws` to the game server. See [development](development.md) for test configuration.

## Deployment and cache consistency

The HTTP server serves HTML and unversioned public assets with `Cache-Control: no-cache`, `version.json` with `no-store`, and content-hashed JS/CSS bundles with `public, max-age=31536000, immutable`. Vite separates dependencies into `vendors-[hash].js`; unchanged vendor content retains its filename while changed app code gets a new one. Deploy the client HTML, version file and hashed assets together as one release, retaining older hashed assets while existing clients may request them. Keep the SQLite database across deployments. Live scenes are deliberately not persisted; restarting returns recovered players to the village.

Both client builds generate smaller `.br` and `.gz` companions for text assets
over 1 KiB through `vite-plugin-compression2`, retaining the original files.
Deploy these companions with their matching originals. Both servers negotiate
`Accept-Encoding`, honor quality weights and explicit exclusions, and prefer
Brotli on ties, then gzip. Missing companions fall back to another acceptable
representation; requests rejecting every available encoding receive 406.
Responses include `Vary: Accept-Encoding`, the original MIME/cache policy,
and the selected representation's content length; HEAD sends the same headers
without a body. `version.json` is excluded from compression to keep build checks
fresh. Compression affects downloads only, not game simulation or frame rate.

## Persistence and backup

The server uses Node 24's built-in SQLite database at `packages/server/data/characters.sqlite` in both development and production. `SAVE_PATH` overrides this path; keep it on persistent storage. Saves include name, level, XP, current/max HP and mana, and total time in worlds. World membership and position remain temporary. Saves happen on entry, every five seconds, on leave/disconnect, and on graceful shutdown; an abrupt process or machine failure can lose up to five seconds of recent changes. SQLite uses WAL and full synchronous writes. Stop the server before copying the database for backup, or use a SQLite-aware online backup that includes committed WAL data. Never put the database under the client public directory.

For a stopped-server backup, preserve the data directory before upgrading and restore only while stopped. Keep a compatible application build with the backup. Live scene restoration and account recovery are not implemented; see [characters](specs/characters.md).

## Operational limits

The server owns positions at 20 Hz, normalizes diagonal movement, wraps positions at map edges, and clears stale input. Input/schema validation, payload and connection limits, bounded password-hashing concurrency, per-connection rate limits, slow-consumer eviction and heartbeat cleanup protect the basic protocol. Passwords use salted scrypt and never appear in world listings. Same-origin browser WebSocket connections are enforced. Internet hosting should additionally enforce ingress/IP limits at the reverse proxy; per-connection limits do not stop reconnect-based abuse.

Rendering runs independently of React at the display frame rate. Forest combat uses up to 160 enemies per scene; red projectiles are capped at 160. Before adding large waves, profile a WebGL sprite batch renderer, spatial partitioning and compact/delta network snapshots against an explicit enemy/player target. Preserve server authority and keep high-frequency entities out of React state.

A browser launch proves connectivity, not public reachability, persistence recovery or performance. Verify these separately. No automated deployment pipeline or GitHub Actions workflow exists in the documented baseline.

Sources: [server entrypoint](../packages/server/src/index.ts), [HTTP/WebSocket server](../packages/server/src/worlds.ts), [certificate setup](../scripts/setup-https.ps1), [client build](../packages/client/vite.config.ts), [character store](../packages/server/src/characters.ts).
