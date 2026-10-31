# Steam login and deployment

[Back to Running, hosting and saves](../operations.md).

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
callback reachability. See [account design](../design/steam-accounts.md).
