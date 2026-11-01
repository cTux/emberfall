# Artwork delivery

[Back to Development and verification](../development.md).

## Artwork delivery

`scripts/package-player-art.mjs` declares each class's source rows and approved
walk directions. `scripts/art/isolate-player-frames.mjs` decodes sources and
finds connected sprites; `pack-player-frames.mjs` selects and packs their frames.
`match-player-palette.mjs` matches walking colors to the standing palette on the
same browser canvas. The coordinator owns file writes, browser lifetime and
handle disposal. When refactoring this pipeline, run old and new scripts against
disposable source copies and compare all four atlas PNGs and JSON files before
touching shipped assets. Keep the authored handedness and calibration exceptions.

Apply the item/entity artwork rule in [AGENTS.md](../../AGENTS.md) when adding or
changing game content. Use the existing art as a style reference and the
[client skill](../../.agents/skills/emberfall-new-client/SKILL.md) for generation
ownership. Save the selected generated asset in the client asset collection,
retain transparency where required, and record its prompt, tool, generating
agent/model, date, source/export dimensions and any mechanical packaging alongside
the asset. Keep the collection's attribution and license notices.

Generate large source images with enough detail for clean cropping and future
exports. Preserve those originals and their provenance. Resize production copies
through the client's Vite image plugins to the largest actual render use, with
the existing 2x backing detail where required. Include transparent gutters,
trimmed visible-frame bounds, atlas layouts and terrain overlap when deriving
the size; a sheet's outer dimensions alone do not establish sufficient detail.
Register new oversized artwork in
[`asset-render-sizes.ts`](../../packages/client/asset-render-sizes.ts) and update
the bound when a larger consumer is added. Keep alpha, source-coordinate crops
and progressive PNG encoding, and leave already-small art at its existing size.
Verify the built production copies at game size, including relevant atlas
frames, masks and repeating seams; development serves the large originals.
See [build assets](build-assets.md#render-sized-production-copies) for the pipeline.

Wire the dedicated artwork into every affected presentation, including inventory
and trading for items. Inspect the generated image and verify it at its actual
display size in the client. Completion requires the asset, provenance and working
consumer together; a gameplay-only implementation with placeholder art is unfinished.
