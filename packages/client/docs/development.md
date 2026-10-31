# Client development and verification

[Back to PixiJS client](../README.md).

Code paths in this guide are relative to `packages/client` unless prefixed with another package or repository directory.

## GitHub Pages

The [deployment workflow](../../../.github/workflows/deploy-pages.yml) publishes
this client after a successful manual full Verify run on current `main`, using
`BASE_API` and `BASE_PORT` as public
build variables. API/account requests and game traffic use the remote backend;
assets, audio and version checks use the Pages base path. See
[Pages setup and server configuration](../../../docs/operations/github-pages.md#github-pages-client-with-a-server-on-your-machine)
for repository settings, Steam variables, HTTPS and browser cookie limitations.

## Develop and reuse

Read content from core registries or `@emberfall/core/definitions/*`; don't introduce a separate client
balance table. Reuse core geometry wrappers and prediction/attribute utilities. Keep visual
effects and sound keyed to acknowledged/predicted actions so reconciliation
does not replay them. Use the reconciled player pose for camera and attachments.
Keep chat, pickup rewards and damage confirmation on the server.

Use controlled components and callbacks from `@emberfall/ui`; read its own
README/AGENTS first. Browser settings and identity retain `emberfall-new.*`
keys so existing preferences and recovery state survive the package rename.

## Verify

Inventory opens through the HUD or physical `KeyI`. `equipment-view.tsx` owns
registered slot coordinates/labels and fallback icons through pure
`content-views.ts` helpers; it passes controlled views and
shared derived stats to `EquipmentPanel` inside the existing draggable window.
`damage-text.ts` renders authoritative damage type and critical metadata for both
training and forest. It never rolls hit outcomes locally.

Run `pnpm typecheck`, affected Node prediction tests via `pnpm test`,
`pnpm build`, then `pnpm test:browser`. Browser scenarios use real
Colyseus rooms and an in-memory test server on port 3013 (`TEST_PORT_NEW` can
override it). Inspect village and forest screenshots, multiple classes, shadows,
glows, clipping, wrapped edges, narrow layouts and reconnects for relevant work.
Generated screenshots and traces stay in ignored `test-results/`.

See [graphics requirements](../../../docs/specs/graphics.md) and the
[runtime design](../../../docs/design/new-runtime.md). Asset credits and licenses
remain under `public/assets`.
