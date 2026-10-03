# PixiJS client

`pnpm dev-new` serves this client at **https://localhost:5174** and starts the new
server on port 3003. `pnpm build-new` creates both production bundles;
`pnpm start-new` builds both bundles and serves them at https://localhost:3003,
so no separate build is needed after installing dependencies. The original client keeps
its own commands, assets, storage keys and server.

## Responsibilities

- `connection.ts` adapts the Colyseus SDK to typed application events. Application
  recovery retains existing world/character behavior; automatic SDK reconnect
  is disabled so the two mechanisms cannot create competing sessions.
- `snapshots.ts` interpolates confirmed remote state. `local-movement.ts`
  predicts bounded local movement and casts, reconciles acknowledgements and
  replays pending input. Hits, health, loot and progress remain authoritative.
- `presentation/world.ts` owns the Miniplex presentation entities. These are
  detached render/prediction objects, separate from Colyseus schemas and server
  ECS objects. Companions remain based on confirmed state.
- `Arena.tsx` coordinates input, camera, audio and world rendering. Shared UI
  components come from the unchanged `@emberfall/ui` package; the host owns
  actions and subscriptions.
- `rendering/pixi-context.ts` translates existing drawing commands into pooled
  native Pixi sprites, geometry, text and masks. The visible canvas is WebGL.
  Canvas 2D is used to bake assets, light masks and small glow primitives, not
  to upload a complete world frame as a texture.

## Render resource rules

Reuse source textures and mutable sprite frames. Cache gradient color ramps
independently of camera position. Reuse baked particle glows rather than applying
a blur filter to every spark. Release textures, masks, text and pools when the
renderer is disposed; trim unused caches. Keep rendering at viewport resolution
and honor the existing graphics settings. Moving lights need distinct canvas
sources and explicit texture revisions so one light cannot overwrite another.

The canvas exposes read-only `data-renderer` and `data-render-stats` diagnostics
for profiling. A successful build or screenshot does not establish performance;
record scene, viewport, settings, browser/GPU, warmup and frame-time distribution.

## Develop and reuse

Read content from `common-new/definitions`; don't introduce a separate client
balance table. Reuse the shared kernels for geometry and prediction. Keep visual
effects and sound keyed to acknowledged/predicted actions so reconciliation
does not replay them. Use the reconciled player pose for camera and attachments.
Keep chat, pickup rewards and damage confirmation on the server.

Use controlled components and callbacks from `@emberfall/ui`. Both clients must
continue working if the shared UI changes; read its own README/AGENTS first.
Browser settings and identity use `emberfall-new.*`, preserving the old runtime.

## Verify

Run `pnpm typecheck-new`, affected Node prediction tests via `pnpm test-new`,
`pnpm build-new`, then `pnpm test:browser-new`. Browser scenarios use real
Colyseus rooms and an in-memory test server on port 3013 (`TEST_PORT_NEW` can
override it). Inspect village and forest screenshots, multiple classes, shadows,
glows, clipping, wrapped edges, narrow layouts and reconnects for relevant work.
Generated screenshots and traces stay in ignored `test-results/`.

See [graphics requirements](../../docs/specs/graphics.md) and the
[runtime design](../../docs/design/new-runtime.md). Asset credits and licenses
remain under `public/assets`.
