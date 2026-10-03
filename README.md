# Emberfall

An online-only 2D cooperative bullet hell game built with TypeScript, React and Canvas 2D. Players meet in a village, choose one of four classes and enter a shared forest encounter with enemies, a boss and a Druid companion. The server owns combat and saved character progress.

Visual inspiration: [Asgard's Fall](https://store.steampowered.com/app/2780710/Asgards_Fall/). No assets are copied from that game.

## Run

Requires Node 24, pnpm 11 and PowerShell 7 for local certificate setup.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open https://localhost:5173. Use a second browser profile to join as another character. The local certificate is self-signed. See [running and hosting](docs/operations.md) for HTTPS, internet access, configuration and save backups.

Production:

```sh
pnpm build
pnpm start
```

Production serves the client and WebSocket endpoint at https://localhost:3001.

## Documentation

- [Feature specifications and documentation map](docs/README.md)
- [Technical architecture](docs/design/architecture.md)
- [Implementation plan and delivered baseline](docs/plans/implementation.md)
- [Development and verification commands](docs/development.md)
- [Shared UI and Storybook guide](packages/ui/README.md)
- [Asset sources and attribution](docs/assets.md)
- [Agent instructions](AGENTS.md)

Current boundaries: online only, up to eight players per world, one Forest / Easy scene per world, building service placeholders, and saved XP without implemented level advancement or talent effects. Future progression must work [without required choices or gameplay interruption](docs/specs/progression.md).

## Packages

| Package           | Responsibility                                             |
| ----------------- | ---------------------------------------------------------- |
| `packages/common` | Shared contracts, geometry and simulation                  |
| `packages/server` | Authoritative worlds, WebSocket sessions and SQLite saves  |
| `packages/client` | Browser connection, input, prediction and Canvas rendering |
| `packages/ui`     | Controlled MUI components, theme and Storybook             |

## Checks

```sh
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Browser/UI commands and change-specific verification are in the [development guide](docs/development.md).
