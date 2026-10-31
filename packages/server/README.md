# Authoritative game server

Run from the repository root with Node 24 and pnpm 11:

```sh
pnpm dev
pnpm build
pnpm start
pnpm test
```

Development and production use port **3003** (`BASE_PORT`, then `PORT_NEW`, override it).
From the repository root, `pnpm start` sets up local HTTPS, builds the runtime
packages, and starts the server only if the build succeeds. It works without
existing `dist` folders after installing dependencies and refreshes the bundles
on each start. To run an already-built deployment without rebuilding, use
`pnpm --filter @emberfall/server start` with certificates already configured.
Production serves `client/dist`. The default database is
`packages/server/data/characters.sqlite`; `SAVE_PATH_NEW=:memory:` is useful
for disposable tests. TLS uses the existing local certificate setup. Ports and override names are retained for compatibility. After the package rename,
keep `SAVE_PATH_NEW` pointing to the existing database or move a stopped backup
from `packages/server-new/data` to `packages/server/data` before startup.

Read only the topic needed for the current task. Each linked page owns its detailed guidance.

## Server logs

See [Server ownership and logging](docs/architecture.md#server-logs).

## Ownership and patterns

See [Server ownership and logging](docs/architecture.md#ownership-and-patterns).

## Bundled content startup

See [Server ownership and logging](docs/architecture.md#bundled-content-startup).

## Persistence

See [Persistence and offline imports](docs/persistence.md#persistence).

## Extend and test

See [Extend and test the server](docs/testing.md#extend-and-test).

## Village dialogue

See [Village dialogue setup and troubleshooting](docs/dialogue.md#village-dialogue).

<a id="windows-setup-in-gai"></a>

See [topic detail](docs/dialogue.md#windows-setup-in-gai).

<a id="check-and-troubleshoot"></a>

See [topic detail](docs/dialogue.md#check-and-troubleshoot).
