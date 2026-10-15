# Core library

`@emberfall/core` is the home for shared game configuration and reusable game
logic utilities. Existing game code has not been migrated.

Keep configuration and utilities usable by both the browser and server, without
DOM access, Node-specific APIs, transport, persistence or presentation dependencies.

Export public APIs from `src/index.ts`. Consumers should declare
`"@emberfall/core": "workspace:*"` in their dependencies and import from
`@emberfall/core`.

Like the existing common libraries, this private workspace package exports
TypeScript source directly for Node 24 and Vite; it needs no separate build.

`isChanced(percent)` returns whether a random roll triggers the given percentage.
For example, `isChanced(25)` has a 25% chance of returning `true`. Fractional
percentages are supported. Values at or below 0 always return `false`, values at
or above 100 always return `true`, and `NaN` returns `false`.

`isMultiChanced(percent)` returns the number of triggered events: each full 100%
guarantees one event, and the remaining percentage rolls for one more. For
example, `isMultiChanced(150)` returns 1 or 2 with equal probability. Values at
or below 0 and `NaN` return 0; `Infinity` returns `Infinity`.

`levelUp({ level, experience, paragon? })` returns a fresh object containing
`level`, unspent `experience`, and `paragon` (default 0), applying as many
level-ups as the experience allows. Levels start at 1 and stop at 20; further
level-ups increase paragon without a cap. The next level-up costs
`50 * 2 ** (level + paragon - 1)`: 50, 100, 200, and so on, continuing the curve
into paragon. Callers supply valid levels, nonnegative paragon integers and
finite nonnegative experience; inputs are not validated. Fractional experience
is supported. The server applies this utility after combat rewards; level,
paragon and unspent XP use the existing per-class save lifecycle.
`experienceRequired(level, paragon = 0)` exposes the same next-level cost for
the client's confirmed XP display.

These utilities live in `src/utils` and are exported from `@emberfall/core`.

Run `pnpm --filter @emberfall/core typecheck` and
`pnpm --filter @emberfall/core test` from the repository root.
