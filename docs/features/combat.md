# Combat and progression: implementation and coverage

[Feature map](../features.md). Links identify implementation and coverage; they do not claim a test was run.

## Tactics

Tactics: [UI-01](../specs/interface/hud.md#tactics),
[controlled window](../../packages/client/src/Tactics.tsx),
[structural contract](../../packages/common/src/tactics.ts),
[shared selectors](../../packages/core/src/tactics.ts),
[authoritative checks](../../packages/server/src/tactics.test.ts),
[healing checks](../../packages/server/src/tactics-healing.test.ts),
[persistence checks](../../packages/server/src/tactics-persistence.test.ts), and
[desktop interactions](../../tests/tactics.spec.ts).

## DOT Speed

DOT Speed: [equipped effects](../specs/item-rolls.md#item-02--equipped-effects-and-drops),
[ailment timing](../../packages/core/src/class-combat.ts),
[rule checks](../../packages/server/src/dot-speed.test.ts) and
[desktop presentation](../../tests/dot-speed.spec.ts).

## DPS meter visibility

DPS meter visibility: [UI-03](../specs/interface/settings.md#ui-03--network-and-performance-feedback),
[saved preference](../../packages/client/src/preferences.ts), [HUD](../../packages/client/src/Arena.tsx)
and [toggle/persistence verification](../../tests/dps-meter.spec.ts).

## Talents

Talents: [rules](../specs/progression.md#prog-03--talents),
[design](../design/runtime/combat.md#talent-configuration),
[authoritative tests](../../packages/server/src/talents.test.ts) and
[browser scenario](../../tests/talents.spec.ts).

## Explicit parties

Explicit [parties](../specs/worlds/parties.md#party-01--explicit-parties) use
[server membership and independent runs](../../packages/server/src/parties.ts),
[authoritative tests](../../packages/server/src/parties.test.ts) and
[browser verification](../../tests/parties.spec.ts).
