# Independent runtime implementation

The accepted scope is full parity with the current game in independent packages.

## Delivered

- Independent packages, scripts, ports, browser keys and SQLite save path.
- Plain definitions for players, enemies, bosses, companions, critters, pickups,
  abilities, ailments, worlds and encounters, with reference validation.
- Authoritative Miniplex membership and shared simulation kernels, ordered query
  views, fixed input budgets, native Colyseus schema replication and SDK client.
- Colyseus database saves, revision conflicts, atomic class changes, recovery,
  shutdown failure isolation and a read-only legacy backup importer.
- Native Pixi rendering, resource pools/caches, presentation ECS, existing
  movement/cast prediction, audio and unchanged shared UI composition.
- README and AGENTS guidance in each new package, and three focused repo skills
  for content, client and server development/testing/reuse.

## Verification record

Local checks on 2026-10-03; these are not CI results.

| Area                                        | Evidence                                                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rules, prediction, sessions and persistence | `pnpm test-new`: 104 passing Node tests, including ECS equivalence, real SDK connections, restart/import/CAS and injected shutdown failure                                                                                                       |
| Exact sampled parity and isolation          | `pnpm test:parity-new`: four checks; all assets/credits hashed identically, runtime import boundaries checked, definitions/generated geometry compared, four classes compared over 600 seeded ticks each                                         |
| Type safety and builds                      | `pnpm typecheck-new`, root `pnpm typecheck`, and `pnpm build-new` pass                                                                                                                                                                           |
| Development transport                       | `pnpm dev-new` starts ports 5174/3003; a real browser creates a world through Vite matchmaking and WebSocket proxies with native Pixi active                                                                                                     |
| Browser behavior                            | `pnpm test:browser-new`: 11 passing scenarios covering fonts, all classes/training, chat/reconnect, forest vote/boss/return, password/host transfer, permanent worlds, reload, physical keyboard layouts, shared HUD/settings and narrow layouts |
| Rendering review                            | Village training/Druid/Bear, forest combat/return and High preview screenshots inspected; visible canvas uses WebGL at viewport resolution                                                                                                       |

The original runtime's 97 Node tests, workspace typecheck and original build also
pass. Both production commands accepted browser joins concurrently on separate
ports with disposable databases. The new development proxy also passed a join
with `PORT_NEW=3005`; Turbo forwards both new port and save-path overrides.
Frozen-lockfile installation, new lint/format checks and all three skill validators
pass. New documentation/skill links resolve. Manual skill routing checks distinguish
new content, presentation and server tasks from original-runtime and unrelated work.

### Performance sample

`pnpm benchmark-new` uses a seeded party of eight stationary players and 160 mixed
enemies at 20 Hz, with 100 warmup ticks and 400 measured ticks. On this host,
simulation averaged 1.88 ms (p95 6.41 ms) and projection/encoding for eight clients
averaged 2.72 ms (p95 6.11 ms). Encoded patches totalled about 1.06 MB/s for the
party before WebSocket framing/compression. This measures kernels and replication,
not database latency, network behavior, end-to-end capacity or a moving party.

The browser used ANGLE SwiftShader software rendering. A High preview at a
1440×1000 viewport and 1.5 render scale measured about 86.6 ms average frame time
(p95 100.1 ms) after a three-second warmup over a three-second sample. It retained
358 pooled visuals, ten source textures and two gradient ramps. This is a software
renderer observation, **not a hardware GPU performance claim**. The rendering
test attaches browser/GPU metadata and current measurements for reproducibility.

### Limits

Hardware GPU benchmarking and exhaustive pixel-by-pixel comparison are not
established by these checks. The server remains single-process with SQLite and
an in-process party registry. Browser audio code and assets are ported unchanged;
automated tests do not establish subjective audio quality. The production client
still produces Vite's large vendor-chunk warning. Existing specs remain the full
behavior contract; sampled checks do not prove every possible state combination.
