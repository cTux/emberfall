# Artwork delivery

[Back to Development and verification](../development.md).

## Artwork delivery

`scripts/package-player-art.mjs` declares each class's source rows and approved
walk directions. `scripts/art/pack-player-frames.mjs` isolates and packs frames;
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

Wire the dedicated artwork into every affected presentation, including inventory
and trading for items. Inspect the generated image and verify it at its actual
display size in the client. Completion requires the asset, provenance and working
consumer together; a gameplay-only implementation with placeholder art is unfinished.
