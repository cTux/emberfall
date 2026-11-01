# GitHub Pages with a separate backend

[Back to Running, hosting and saves](../operations.md).

## GitHub Pages client with a server on your machine

The [Pages workflow](../../.github/workflows/deploy-pages.yml) builds only the client
and deploys the exact SHA from a successful manual Verify run on
current `main`. For a release candidate, use **Actions → Verify → Run
workflow → main**, or `gh workflow run verify.yml --ref main`. PRs run static
checks, Node suites, builds and affected shared UI browser checks without deploying.
Desktop game checks are skipped by default; enable **Run desktop game checks**
or add `-f desktop_game_checks=true` to the CLI command to run them manually.
Intermediate merges do not repeat verification. The release is rejected if `main`
advances before building or deployment; rerun Verify on the new head. The server
must be deployed/restarted separately with a compatible protocol version.

1. In the GitHub repository, open **Settings → Pages → Build and deployment**
   and choose **GitHub Actions** as the source.
2. In **Settings → Secrets and variables → Actions → Variables**, optionally
   add repository variables `BASE_API=176.36.232.74` and `BASE_PORT=4003`.
   These are already the workflow defaults. `BASE_API` is a host/IP without a
   scheme, port or path. The client uses HTTPS and WSS. For a tunnel on standard
   HTTPS, use its hostname and `BASE_PORT=443`.
3. Merge the intended release into `main`, then dispatch the Verify run.
   After it passes, Pages publishes the client at
   `https://ctux.github.io/emberfall/` for this repository. The workflow derives
   the asset base path from Pages configuration, including custom domains.
4. On the machine running the server, configure the ignored root `.env` or
   `packages/server/.env`, then restart:

   ```dotenv
   BASE_PORT=4003
   STEAM_ORIGIN=https://176.36.232.74:4003
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
plus reachable inbound TCP 4003 through the router/firewall. The generated local
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
[the client environment example](../../packages/client/.env.example) to
`packages/client/.env.local`, or set `BASE_API`/`BASE_PORT` in the build environment.
Vite loads root and client environment files; client files override root files,
and shell variables override both. Only the two public API variables are
explicitly exposed; existing Vite-prefixed variables remain public as usual.
`PAGES_BASE_PATH=/emberfall/` sets the path for a manual project-site build.
Without `BASE_API`, the client connects to its own origin, preserving local setup.

Verification: test `/health` from outside the home network, a real Steam login,
nickname save, game join and logout from the deployed Pages URL in the target
browsers. Automated [account tests](../../packages/server/src/account-client-origin.test.ts) cover
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

Verify `https://176.36.232.74:4003/health` from another device without a browser
certificate warning before testing Pages login again. Do not disable certificate
verification or expose an HTTP backend to work around this error: the client
requires HTTPS/WSS and secure login cookies.
