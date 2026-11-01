# Desktop browser and UI verification

[Back to Development and verification](../development.md).

## Browser and UI verification

Renderer timing samples collect at least six complete frame intervals over a
minimum three-second window, with a fifteen-second deadline for slow software GPUs.
Reports retain the actual sample duration and are attached before assertions, so
insufficient-frame failures keep their hardware/timing evidence. Resource bounds
and the six-frame assertion remain unchanged.

The CI desktop game suite allows four minutes per scenario because software
rendering on hosted runners can make each browser input take several seconds.
Assertion deadlines remain unchanged; local scenarios retain the 90-second budget.

The independent runtime uses `pnpm dev`, `pnpm build`, and `pnpm start`.
`pnpm start` sets up HTTPS and builds the runtime packages before launching,
so a fresh checkout needs no separate build step after installing dependencies.
Its development client is on 5174 and its server on 4003. Use `PORT_NEW` and
`SAVE_PATH_NEW` for overrides; these names are retained for deployment compatibility.
`pnpm typecheck` and `pnpm test` validate the workspace. Build before
`pnpm test:browser`; those tests own an in-memory server per test on 3013
(`TEST_PORT_NEW` overrides it), run sequentially, and never reuse a live database.
Functional browser tests use Balanced graphics; explicit rendering tests use
High. The [package guides](../design/new-runtime.md) explain ownership and reuse.
The old-runtime parity comparison was retired with the original packages.
`pnpm benchmark` measures simulation and
replication kernels; see the [verification record](../plans/new-runtime.md) for scope.
`pnpm benchmark:runtime` measures the production server through native SDK clients
and disposable disk-backed SQLite at 1, 4 and 8 occupied worlds. See the
[methodology and recorded results](../benchmarks/runtime.md) for workload, metrics
and limits; it does not use a live server or player database.
`pnpm lint` checks source and styles. Use `pnpm import-save` only
with an offline backup and a new destination, as described in the
[server guide](../../packages/server/README.md).

```sh
pnpm exec playwright install chromium
pnpm test:browser
pnpm --filter @emberfall/client exec node --test pages-fonts.test.ts
pnpm --filter @emberfall/ui typecheck
pnpm --filter @emberfall/ui build
pnpm --filter @emberfall/ui test
```

Root Playwright owns a fresh production server and in-memory database per test on port 3013.
`TEST_PORT_NEW` overrides the port. Build first; the suite runs one worker and never reuses a running server.

The UI suite starts Storybook on port 6007; interactive Storybook uses 6006. It can reuse an existing server outside CI. See the [UI guide](../../packages/ui/README.md) for component authoring and accessibility checks.

Focused examples:

```sh
node --test packages/server/src/class*.test.ts packages/server/src/training*.test.ts
pnpm exec playwright test tests/gameplay.spec.ts
pnpm benchmark
```

Browser artifacts go to ignored `test-results/` and `playwright-report/` as configured by the suites. Treat screenshots as review evidence, not proof of unmeasured gameplay or performance.

For an opt-in hardware frame-budget measurement, build the new client, set
`PERF_NEW=1`, then run `pnpm test:browser tests/frame-budget.spec.ts`.
The isolated village, training, moving-forest and 80-enemy crowded cases use High at 1440×1000,
three seconds of warmup and 1,200 uncapped animation frames each. JSON records
include browser/GPU, frame percentiles and frames over the 240 FPS budget;
screenshots accompany them in `test-results/`. Windows uses ANGLE D3D11.
Set `PROFILE_NEW=1` to also capture CPU profiles; profiling adds overhead, so
compare runs with the same configuration. These samples do not guarantee 240 FPS
on other viewports, machines or arbitrary combat loads.
