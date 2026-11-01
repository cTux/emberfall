# Village life and gathering: implementation and coverage

[Feature map](../features.md). Links identify implementation and coverage; they do not claim a test was run.

## Portal dimensions

[SCENE-07](../specs/scenes/forest.md#scene-07--dimensions):
[registered content](../../packages/core/src/mods/dimensions.mod.ts),
[portal controls](../../packages/client/src/WorldPanels.tsx),
[dimension rules](../../packages/core/src/dimensions.ts),
[authoritative checks](../../packages/server/src/dimensions.test.ts),
[resource checks](../../packages/server/src/dimension-resources.test.ts), and
[desktop verification](../../tests/dimensions.spec.ts).

## Interactive cats

Interactive cats: [SCENE-06](../specs/scenes/village.md#scene-06--village-life),
[speech timing](../../packages/client/src/cat-speech.ts),
[client interaction](../../packages/client/src/Arena.tsx) and
[browser verification](../../tests/cats.spec.ts).

## Resident workstations

Resident workstations: [SCENE-06](../specs/scenes/village.md#scene-06--village-life),
[registered work spots](../../packages/core/src/mods/base/worlds/village.ts),
[authoritative routines](../../packages/server/src/npcs.ts),
[work poses and effects](../../packages/client/src/npc-art.ts),
[server verification](../../packages/server/src/npc-workstations.test.ts) and
[browser verification](../../tests/npcs.spec.ts).

## Resource gathering

Resource gathering: [VILLAGE-07](../specs/scenes/gathering.md#village-07--gathering),
implemented by [shared rules](../../packages/core/src/gathering.ts), reusable
[timed activities](../../packages/core/src/timed-activity.ts) and the
[progress bar](../../packages/client/src/timed-activity.ts), and verified by
[gathering tests](../../packages/server/src/gathering.test.ts) and
[browser gathering checks](../../tests/gathering.spec.ts).
