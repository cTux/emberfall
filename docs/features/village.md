# Village life and gathering: implementation and coverage

[Feature map](../features.md). Links identify implementation and coverage; they do not claim a test was run.

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
