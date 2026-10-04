# Steam accounts

Status: implemented in the new runtime. Behavior: [CHAR-05](../specs/characters.md#char-05--steam-accounts-and-nickname)
and [UI-04](../specs/interface-and-audio.md#ui-04--settings-and-music).
The original runtime remains unchanged. Steam accounts start fresh; existing
browser saves and their bearer keys are preserved without linking or merging.

## Authentication and account ownership

[steam.ts](../../packages/server-new/src/steam.ts) implements the fixed Steam
OpenID 2.0 provider with direct server verification. Login redirects to Steam;
Emberfall never receives Steam passwords. OpenID supplies the verified Steam ID.
The server separately calls `GetPlayerSummaries/v2` with its Web API key for the
initial nickname. API keys never reach the client. Steam IDs remain decimal strings.
This does not check game ownership or require a native Steamworks client.

The verifier validates the namespace, response mode, exact return URL, provider,
matching claimed/local identities, signed fields, individual Steam ID range and
fresh response nonce. Duplicate query parameters and concurrent/replayed nonces
are rejected. Verification POSTs only to the fixed HTTPS Steam endpoint; requests
have eight-second timeouts and reject redirects. Nonces are retained for six
minutes; accepted timestamps are at most five minutes old or one minute ahead.

This small fixed-provider adapter uses native fetch rather than a general OpenID
library. Review of steam-signin 1.0.4 found additional exact-return-URL,
nonce and timeout enforcement was necessary for this design. Our rejection tests
cover those checks; they do not constitute an external security audit.

Sources: [Valve authentication](https://partner.steamgames.com/doc/features/auth),
[profile API](https://partner.steamgames.com/doc/webapi/ISteamUser#GetPlayerSummaries),
[OpenID verification](https://openid.net/specs/openid-authentication-2_0.html#verification),
[reviewed alternative](https://github.com/DoctorMcKay/node-steam-signin).

## HTTP and game sessions

[accounts.ts](../../packages/server-new/src/accounts.ts) owns these routes:

| Route                         | Behavior                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /auth/steam`             | Create a five-minute login attempt bound to a random browser cookie; redirect to Steam.                     |
| `GET /auth/steam/callback`    | Verify the single-use attempt and assertion; rotate the Emberfall session and redirect to a clean game URL. |
| `GET /api/account`            | Return authentication state, game nickname and Steam suggestion, without credentials.                       |
| `PATCH /api/account/nickname` | Validate and commit the nickname, completing first setup; update live player names after commit.            |
| `POST /api/account/ticket`    | Exchange the session for a 30-second, single-use game-connection ticket. Requires completed setup.          |
| `POST /auth/logout`           | Revoke the session, clear its cookie and close its active game connections.                                 |

Sessions use random 256-bit tokens with only SHA-256 hashes stored in SQLite.
Cookies are host-only, Secure, HttpOnly, SameSite=Lax and path `/`. Sessions expire
after seven days. Account mutations require the exact configured Origin; nickname
requests require JSON and bounded input. Responses disable caching, callback
responses suppress referrers, and errors omit upstream URLs, keys and assertions.
Login starts allow 20 attempts per remote IP per minute; account mutations/tickets
allow 30 per account per minute. Maps are bounded and callbacks allow eight
concurrent upstream verifications. Reverse proxies still need ingress limits.

[worlds.ts](../../packages/server-new/src/worlds.ts) validates the browser Origin
and consumes a ticket on Colyseus admission. Tickets stay in client memory, not
localStorage. A session is rechecked on join, on every command, after asynchronous
password work, and once per second for idle connections. Logout follows the
existing disconnect/save lifecycle. Expired or revoked credentials cannot resume.

[runtime.ts](../../packages/server-new/src/runtime.ts) derives character identity
and name from the authenticated session. Legacy wire name/token fields cannot
select or rename a Steam character. They remain in the compatibility protocol for
existing simulation tests; Steam replies return an empty character token. Existing
duplicate-live-character rejection and reconnect/world authorization still apply.

## Persistence and UI

[CharacterStore](../../packages/server-new/src/characters.ts) adds `steam_accounts`
with unique Steam ID, unique linked character ID, nullable game nickname and Steam
name; `account_sessions` stores token hashes, account references and expiry.
Account creation and nickname completion are transactional. Nested savepoints let
account creation reuse existing character creation without partial records. Progress
continues to use Colyseus cloud-save slot 0 and revision checks.

A null nickname means first setup is incomplete. Profile failures permit manual
entry; later Steam names cannot overwrite a chosen nickname. Rename updates the
account and character metadata before live state. Autosave uses the canonical
account nickname, so stale player data cannot undo a rename. Historical chat text
is preserved. Server restarts preserve accounts, sessions and progress.

[Account.tsx](../../packages/client-new/src/Account.tsx) gates entry and owns the
same dialog for first setup and editing. [Settings](../../packages/client-new/src/Settings.tsx)
adds Account, Change nickname and Sign out. Existing GameWindow supplies focus,
dragging and modal input blocking. Invalid names remain editable; failed writes
keep the draft and dialog open. Editing starts from the saved game nickname;
first setup starts from the Steam suggestion. Names allow duplicates, trim outer
whitespace, and use the existing 24 UTF-16-unit limit with control/format characters
rejected. Presentation preferences remain local.

## Configuration and verification

The executable requires `STEAM_ORIGIN` and `STEAM_WEB_API_KEY` and fails closed when
missing. The origin is the canonical HTTPS browser origin, without trailing slash.
See [operations](../operations.md#steam-login-new-runtime) for deployment and rollback.
Vite proxies `/auth` and `/api` along with matchmaking and WebSockets. Tests use
injected upstream responses; there is no test-login HTTP endpoint or environment
switch that disables authentication. The server factory's omitted Steam option
exists only for isolated legacy-protocol/parity fixtures; the executable always
supplies validated Steam configuration.

[Account tests](../../packages/server-new/src/accounts.test.ts) cover assertion
rejections, browser binding, CSRF, session/ticket authorization, nickname ownership,
logout, database restart and untouched legacy saves. [Browser tests](../../tests-new/accounts.spec.ts)
cover onboarding/reload, edit/cancel/failure, another player's view, repeat login,
profile outage and narrow layouts. These tests mock Steam responses while exercising
the real HTTP, cookie, Colyseus and UI boundaries. A full live Steam login with the
deployment's API key and public origin remains an operational smoke test.
