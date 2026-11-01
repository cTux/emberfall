# Rendering, controls and feedback: implementation and coverage

[Feature map](../features.md). Links identify implementation and coverage; they do not claim a test was run.

## Game version and server status

[WORLD-02](../specs/worlds/membership.md#world-02--client-updates),
[version calculation](../../scripts/game-version.ts),
[indicator](../../packages/client/src/GameControls.tsx),
[version tests](../../tests/game-version.test.ts) and
[desktop connection checks](../../tests/server-version.spec.ts).

## Damage number visibility

Damage number visibility: [UI-04](../specs/interface/settings.md#ui-04--settings-and-music),
[shared renderer](../../packages/client/src/damage-text.ts),
[saved preference](../../packages/client/src/preferences.ts),
[ownership checks](../../tests/damage-text.test.ts) and
[toggle/persistence verification](../../tests/damage-numbers.spec.ts).

## Day/night cycle

Day/night cycle: [GRAPHICS-03](../specs/graphics/scenery.md#graphics-03--scenery-and-atmosphere),
[palette, clock and sun/moon orbit](../../packages/client/src/day-night.ts),
[silhouette projections](../../packages/client/src/lighting.ts),
[renderer](../../packages/client/src/rendering/pixi-context.ts),
[clock checks](../../tests/day-night.test.ts) and
[browser checks](../../tests/day-night.spec.ts).

## Lobby portal navigation

Lobby portal navigation: [SCENE-03](../specs/scenes/forest.md#scene-03--voting-and-entry),
[shared navigation renderer](../../packages/client/src/navigation.ts) and
[off-screen and wrapped direction checks](../../tests/navigation.test.ts).

## Game cursors

Game cursors: [UI-02](../specs/interface/controls.md#ui-02--combat-controls),
[host cursor states](../../packages/client/src/cursors.ts),
[saved enable/size preferences](../../packages/client/src/preferences.ts),
[cursor art](../../packages/client/public/assets/cursors/README.md) and
[browser verification](../../tests/cursors.spec.ts) and
[state rule checks](../../tests/cursors.test.ts).

## Ability effect visibility

Ability effect visibility: [GRAPHICS-04](../specs/graphics/combat.md#graphics-04--combat-readability),
[opacity and ownership](../../packages/client/src/ability-effects.ts),
[saved preferences](../../packages/client/src/preferences.ts) and
[browser verification](../../tests/ability-effects.spec.ts).

## Town health bar visibility

Town health bar visibility: [GRAPHICS-04](../specs/graphics/combat.md#graphics-04--combat-readability),
[saved preference](../../packages/client/src/preferences.ts),
[toggle/persistence verification](../../tests/town-health-bars.spec.ts) and
[name preservation checks](../../tests/character-name.test.ts).

## Softer entity tones and optional texture filtering

Softer entity tones and optional texture filtering:
[GRAPHICS-01](../specs/graphics/renderer.md#graphics-01--presets-and-renderer),
[atlas tone transform](../../packages/client/src/art-tones.ts),
[renderer/settings verification](../../tests/texture-filtering.spec.ts) and
[tone checks](../../tests/art-tones.test.ts).

## Floating battle text

Floating battle text: [GRAPHICS-04](../specs/graphics/combat.md#graphics-04--combat-readability),
[shared renderer](../../packages/client/src/damage-text.ts),
[animation and grouping tests](../../packages/server/src/damage-text.test.ts) and
[Pixi pixel checks](../../tests/renderer-pixels.spec.ts).

## Bottom-center action bar

Bottom-center action bar: [UI-01](../specs/interface/hud.md#ui-01--hud-and-windows),
[presentation design](../design/presentation.md), [controlled component](../../packages/ui/src/components/ActionBar.tsx)
and [replicated cooldown/gear coverage](../../tests/action-bar.spec.ts).

## Nearby interaction prompt

Nearby interaction prompt: [UI-02](../specs/interface/controls.md#ui-02--combat-controls),
[presentation design](../design/presentation.md), [drawing helper](../../packages/client/src/effects.ts),
[Arena integration](../../packages/client/src/Arena.tsx), and
[village/forest browser coverage](../../tests/interaction-outlines.spec.ts).
The default-on combat gathering hint toggle is covered by
[gathering scenarios](../../tests/gathering.spec.ts) and
[preference validation](../../tests/preferences.test.ts).

## New-client hitbox debugging

New-client hitbox debugging: [UI-04](../specs/interface/settings.md#ui-04--settings-and-music),
[overlay design](../design/new-runtime.md), [renderer](../../packages/client/src/hitboxes.ts)
and [browser verification](../../tests/hitboxes.spec.ts).

## New-client wardrobe-style art

New-client wardrobe-style art: [GRAPHICS-05](../specs/graphics/artwork.md#graphics-05--wardrobe-style-art-in-the-new-client),
[atlas design](../design/runtime/presentation.md#wardrobe-style-presentation-assets), and
[asset provenance and prompts](../../packages/client/public/assets/wardrobe-style/README.md).
Verification: `tests/art-animation.test.ts`, `tests/art-assets.spec.ts`,
and the training/forest browser scenarios in `tests/gameplay.spec.ts`.

## New-client frame-time regressions

New-client frame-time regressions: [performance skill](../../.agents/skills/emberfall-performance/SKILL.md)
and `tests/frame-budget.spec.ts`. Local projectile/pickup offsets:
[reconciliation skill](../../.agents/skills/emberfall-reconciliation/SKILL.md),
[alignment design](../design/runtime/presentation.md#local-effect-alignment),
`packages/server/src/local-projectiles.test.ts` and
`packages/server/src/pickup-presentation.test.ts`.

## Dedicated item/building artwork and gathered-state silhouettes

Dedicated item/building artwork and gathered-state silhouettes: [graphics](../specs/graphics.md),
[item coverage](../../tests/item-art.test.ts), [inventory and resource shadows](../../tests/generated-art.spec.ts),
and [native building masks](../../tests/buildings.spec.ts).

## Loot hints

Loot hints: [receipt design](../design/runtime/presentation.md#loot-hint-receipts), [behavior and animated concept](../specs/graphics/loot-hints.md),
[renderer](../../packages/client/src/loot-hint-rendering.ts),
[receipt tracking tests](../../tests/loot-hints.test.ts), and
[browser coverage](../../tests/loot-hints.spec.ts).
