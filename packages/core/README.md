# Core library

`@emberfall/core` is the home for shared game configuration and reusable game
logic utilities. This package starts empty; existing code has not been migrated.

Keep configuration and utilities usable by both the browser and server, without
DOM access, Node-specific APIs, transport, persistence or presentation dependencies.

Export public APIs from `src/index.ts`. Consumers should declare
`"@emberfall/core": "workspace:*"` in their dependencies and import from
`@emberfall/core`.

Like the existing common libraries, this private workspace package exports
TypeScript source directly for Node 24 and Vite; it needs no separate build.

Run `pnpm --filter @emberfall/core typecheck` from the repository root.
