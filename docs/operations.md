# Running, hosting and saves

Use Node 24, pnpm 11 and PowerShell 7. Install with `pnpm install --frozen-lockfile`. Run `pnpm dev` at https://localhost:5174; use a second isolated browser profile for another character. Production: `pnpm build` then `pnpm start`.

## Steam login (new runtime)

The new runtime requires Steam login. Before `pnpm dev` or `pnpm start`,
set `STEAM_ORIGIN` to the exact browser HTTPS origin (no path/trailing slash) and
`STEAM_WEB_API_KEY` to a server-held [Steam Web API key](https://steamcommunity.com/dev/apikey).
Use `https://localhost:5174` for Vite development or the public HTTPS origin for
production. The callback is `STEAM_ORIGIN/auth/steam/callback`. Turbo passes these
variables to the server; do not use a `VITE_` prefix for the API key. Missing
configuration stops startup rather than enabling guest access.

The server's development and production commands load `.env` from the repository
root, then `packages/server/.env` if present. Package values override root
values; variables already set in the shell take precedence over both files.
Restart the server after editing either file. Keep these files out of Git.

```dotenv
STEAM_ORIGIN=https://localhost:5174
STEAM_WEB_API_KEY=your-steam-web-api-key
```

For production, replace the example origin with the public HTTPS origin.

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

## GitHub Pages client with a server on your machine

The [Pages workflow](../.github/workflows/deploy-pages.yml) builds only the client
and deploys the exact SHA from a successful manual full desktop Verify run on
current `main`. After the merge queue completes, use **Actions → Verify → Run
workflow → main**, or `gh workflow run verify.yml --ref main`. PRs run affected checks without deploying; intermediate merges do not repeat
those checks. The release is rejected if `main`
advances before building or deployment; rerun Verify on the new head. The server
must be deployed/restarted separately with a compatible protocol version.

1. In the GitHub repository, open **Settings → Pages → Build and deployment**
   and choose **GitHub Actions** as the source.
2. In **Settings → Secrets and variables → Actions → Variables**, optionally
   add repository variables `BASE_API=176.36.232.74` and `BASE_PORT=3003`.
   These are already the workflow defaults. `BASE_API` is a host/IP without a
   scheme, port or path. The client uses HTTPS and WSS. For a tunnel on standard
   HTTPS, use its hostname and `BASE_PORT=443`.
3. Merge the intended release into `main`, then dispatch the full Verify run.
   After it passes, Pages publishes the client at
   `https://ctux.github.io/emberfall/` for this repository. The workflow derives
   the asset base path from Pages configuration, including custom domains.
4. On the machine running the server, configure the ignored root `.env` or
   `packages/server/.env`, then restart:

   ```dotenv
   BASE_PORT=3003
   STEAM_ORIGIN=https://176.36.232.74:3003
   CLIENT_URL=https://ctux.github.io/emberfall/
   STEAM_WEB_API_KEY=your-steam-web-api-key
   TLS_CERT=/absolute/path/to/trusted-fullchain.pem
   TLS_KEY=/absolute/path/to/private-key.pem
   ```

`STEAM_ORIGIN` is the **backend** HTTPS origin for Steam callbacks in this setup;
`CLIENT_URL` is the full client landing URL, including `/emberfall/`. The server
allows that client's origin for account reads/mutations and Colyseus admission,
and returns login success/failure to the client. `BASE_PORT` overrides the legacy
`PORT_NEW` for server startup. With `CLIENT_URL` unset, same-origin behavior stays
unchanged. Keep the existing `SAVE_PATH_NEW`, `HOST` and TLS/proxy settings on the
server; none of them belong in the client build. Do not copy the Steam key into
GitHub Pages, a `VITE_` variable, or the workflow. Pages has no runtime environment;
public build settings become visible to visitors. Variable changes require a new
workflow run. Server variable changes require a server restart.

The IP example works only with a publicly trusted certificate valid for that IP,
plus reachable inbound TCP 3003 through the router/firewall. The generated local
certificate does not meet that requirement. Prefer a hostname with trusted TLS,
or an HTTPS tunnel supporting WebSockets; change `BASE_API`, `BASE_PORT` and
`STEAM_ORIGIN` to match. For TLS termination at a reverse proxy, use `HTTP_ONLY=1`
only on the private backend and forward auth, API, matchmaking and WebSocket routes.

When client and backend origins differ, session cookies use `SameSite=None;
Secure`. Browsers that block third-party cookies can still prevent login from
`github.io` to an unrelated IP/hostname. For reliable browser support, configure
a Pages custom domain such as `play.example.com` and a backend such as
`api.example.com`, both HTTPS under the same site. Update `CLIENT_URL` and API
variables accordingly. CORS alone cannot override browser cookie blocking.

For a manual remote-client build, copy
[the client environment example](../packages/client/.env.example) to
`packages/client/.env.local`, or set `BASE_API`/`BASE_PORT` in the build environment.
Vite loads root and client environment files; client files override root files,
and shell variables override both. Only the two public API variables are
explicitly exposed; existing Vite-prefixed variables remain public as usual.
`PAGES_BASE_PATH=/emberfall/` sets the path for a manual project-site build.
Without `BASE_API`, the client connects to its own origin, preserving local setup.

Verification: test `/health` from outside the home network, a real Steam login,
nickname save, game join and logout from the deployed Pages URL in the target
browsers. Automated [account tests](../packages/server/src/accounts.test.ts) cover
cross-origin HTTP, redirects, cookie attributes and SDK authorization with a
mocked Steam provider; they do not verify the public certificate, router or
browser third-party-cookie policy.

### Certificate errors from the Pages client

`net::ERR_CERT_AUTHORITY_INVALID` for `/api/account` means the browser rejected
backend TLS before the account request reached the server. Changing CORS, font
paths or the Pages build cannot repair it. The generated `.certs/localhost.pem`
is for local development; GitHub Pages does not make that backend certificate
trusted.

If no domain or tunnel is available, obtain a publicly trusted certificate with
an IP-address subject alternative name for the public IP. The CA must support
IP certificates; configure its validation and automatic renewal on the server.
Point `TLS_CERT` at its full certificate chain and `TLS_KEY` at its matching
private key, then restart the backend. Keep `BASE_API`, `BASE_PORT` and
`STEAM_ORIGIN` aligned with the certified endpoint. This is a hosting change;
merging the client PR cannot install or renew certificates on the server PC.

Verify `https://176.36.232.74:3003/health` from another device without a browser
certificate warning before testing Pages login again. Do not disable certificate
verification or expose an HTTP backend to work around this error: the client
requires HTTPS/WSS and secure login cookies.

## HTTPS and connectivity

Production serves the built client and secure WebSocket endpoint together at https://localhost:3003. `pnpm dev` and `pnpm start` create a self-signed certificate in ignored `.certs/` if missing (PowerShell 7 required for generation). The certificate covers localhost and current LAN IPv4 addresses and lasts one year. Browsers show a warning until the public certificate is trusted; private keys must never be shared. The OS trust store is not modified. HTTP and HTTPS have separate browser storage, so a saved nickname/character token on the old HTTP origin does not automatically migrate.

For a temporary internet test, build and run `pnpm start`, reserve this PC's LAN address in the router, and forward **TCP 3003 → PC:3003**. Visitors open `https://PUBLIC_IP:3003`; both game traffic and files use that port, with no UDP or separate WebSocket port. Allow inbound TCP 3003 in Windows Firewall on the active network profile. Keep the Vite development port 5174 private. An alternative is external TCP 443 → PC:3003, then use `https://PUBLIC_IP`. External testing requires a public reachable address: CGNAT or upstream double NAT needs ISP/router changes or a tunnel. Test from mobile data, not from the same LAN. A local self-signed certificate causes a warning on other devices and does not cover a public IP; use a domain and publicly trusted certificate for regular hosting.

`BASE_PORT` (falling back to `PORT_NEW`) and `HOST` configure the server. `TLS_CERT` and `TLS_KEY` accept certificate/key PEM paths for a trusted certificate. `HTTP_ONLY=1` explicitly disables backend TLS when using an HTTPS/WSS reverse proxy; do not expose that plaintext backend directly. Local HTTPS follows [Vite's server HTTPS configuration](https://vite.dev/config/server-options#server-https).

The production health endpoint is `/health`; matchmaking and WebSocket traffic use Colyseus. Default binding is `0.0.0.0:3003`. Development proxies `/auth`, `/api`, `/matchmake` and `/colyseus` to the game server. See [development](development.md) for test configuration.

## Deployment and cache consistency

The HTTP server serves HTML and unversioned public assets with `Cache-Control: no-cache`, `version.json` with `no-store`, and content-hashed JS/CSS bundles with `public, max-age=31536000, immutable`. Vite separates dependencies into `vendors-[hash].js`; unchanged vendor content retains its filename while changed app code gets a new one. Deploy the client HTML, version file and hashed assets together as one release, retaining older hashed assets while existing clients may request them. Keep the SQLite database across deployments. Live scenes are deliberately not persisted; restarting returns recovered players to the village.

The client build generate smaller `.br` and `.gz` companions for text assets
over 1 KiB through `vite-plugin-compression2`, retaining the original files.
Deploy these companions with their matching originals. The server negotiates
`Accept-Encoding`, honor quality weights and explicit exclusions, and prefer
Brotli on ties, then gzip. Missing companions fall back to another acceptable
representation; requests rejecting every available encoding receive 406.
Responses include `Vary: Accept-Encoding`, the original MIME/cache policy,
and the selected representation's content length; HEAD sends the same headers
without a body. `version.json` is excluded from compression to keep build checks
fresh. Compression affects downloads only, not game simulation or frame rate.

## Persistence and backup

Account-wide Storehouse saves use format version 2. Back up the stopped database
before upgrading: old class gold is summed and old storages merged on first load
and committed by the next save. Items beyond shared capacity return to the owning
class backpack. Older builds reject version 2; rollback requires the matching
pre-upgrade backup. Retain a post-upgrade backup to preserve new progress.

The package rename moves the default database location from `packages/server-new/data/characters.sqlite` to `packages/server/data/characters.sqlite`. Keep `SAVE_PATH_NEW` set to the existing absolute path, or stop the server and move a backup to the new default before starting. Move package-local `.env` files with the server package. No automatic database migration or save linking occurs. Ports, environment variable names and `emberfall-new.*` browser keys are retained.

The server uses Node 24's built-in SQLite database at `packages/server/data/characters.sqlite` in both development and production. `SAVE_PATH_NEW` overrides this path; keep it on persistent storage. Saves include name, level, XP, current/max HP, and total time in worlds. Authorized world membership is persisted; live positions and combat scenes remain temporary. Saves happen on entry, every five seconds, on leave/disconnect, and on graceful shutdown; an abrupt process or machine failure can lose up to five seconds of recent changes. SQLite uses WAL and full synchronous writes. Stop the server before copying the database for backup, or use a SQLite-aware online backup that includes committed WAL data. Never put the database under the client public directory.

For a stopped-server backup, preserve the data directory before upgrading and restore only while stopped. Keep a compatible application build with the backup. Live scene restoration is not implemented; Steam login recovers account identity. see [characters](specs/characters.md).

## Operational limits

The server owns positions at 20 Hz, normalizes diagonal movement, wraps positions at map edges, and clears stale input. Input/schema validation, payload and connection limits, bounded password-hashing concurrency, per-connection rate limits, slow-consumer eviction and heartbeat cleanup protect the basic protocol. Passwords use salted scrypt and never appear in world listings. Browser WebSocket origins are restricted to the configured client origin. Internet hosting should additionally enforce ingress/IP limits at the reverse proxy; per-connection limits do not stop reconnect-based abuse.

Rendering runs independently of React at the display frame rate. Forest combat uses up to 160 enemies per scene; red projectiles are capped at 160. Before adding large waves, profile the existing PixiJS renderer, spatial partitioning and Colyseus replication against an explicit enemy/player target. Preserve server authority and keep high-frequency entities out of React state.

A browser launch proves connectivity, not public reachability, persistence recovery or performance. Verify these separately. The GitHub Pages workflow deploys the static client only; backend deployment remains manual.

Sources: [server entrypoint](../packages/server/src/index.ts), [HTTP/WebSocket server](../packages/server/src/worlds.ts), [certificate setup](../scripts/setup-https.ps1), [client build](../packages/client/vite.config.ts), [character store](../packages/server/src/characters.ts).
