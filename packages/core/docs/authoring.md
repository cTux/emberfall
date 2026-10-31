# Add a bundled mod

[Back to Core library](../README.md).

Code paths in this guide are relative to `packages/core` unless prefixed with another package or repository directory.

## Add a bundled mod

This example adds a numeric stat, a slot/item, a class/ability and an enemy using
existing engine and art families. Save it as `src/mods/example.mod.ts`, then import
it in `src/mods/index.ts` and append it after `baseMod` in `GAME_MODS`. It is an
authoring example, not content enabled in the shipped game.

```ts
import type { GameMod } from '../content/contracts.ts';

export const exampleMod: GameMod = {
  id: 'example',
  register(r) {
    r.stats.register({
      id: 'example:luck',
      label: 'Luck',
      default: 0,
      aggregation: 'sum',
      format: 'number',
    });
    r.slots.register({
      id: 'example:charm',
      label: 'Charm',
      gearTypes: ['amulet'],
      column: 4,
      row: 1,
    });
    r.items.register({
      id: 'example:charm',
      name: 'Lucky charm',
      kind: 'gear',
      gearType: 'amulet',
      stats: { 'example:luck': 2 },
      price: 1,
    });
    r.abilities.register({
      id: 'example:arrow',
      kind: 'arrow',
      range: 1000,
      manualRange: 1000,
      damage: 5,
      intervalMs: 1000,
      durationMs: 260,
      aimSmoothingSeconds: 0.08,
      speed: 500,
      count: 1,
      spreadRadians: 0,
      piercing: true,
      splashRadius: 0,
      splashDamage: 0,
      bounces: 0,
      bounceRadius: 0,
    });
    r.classes.register({
      id: 'example:scout',
      label: 'Scout',
      attack: 'example:arrow',
      ailment: 'poison',
      art: 'ranger',
      sprite: '/assets/ranger.png',
      starterWeapon: 'ranger-bow',
      gearTypes: ['bow', 'quiver'],
    });
    r.enemies.register({
      id: 'example:runner',
      behavior: 'melee',
      art: 'runner',
      speed: 90,
      radius: 8,
      size: 32,
      reach: 32,
      windup: 500,
      cooldown: 900,
      hitPoints: 15,
      damage: 3,
    });
    r.spawnRules.register({ id: 'example:runner', enemy: 'example:runner', chance: 0.1 });
  },
};
```

References can point to earlier or later registered definitions; validation runs
after every mod registers. Slots require explicit positive grid coordinates.
Stats sum numeric contributions and appear in `characterStats(player).attributes`;
new stat effects need engine rules. Item `loot: true` opts into the existing gear
loot pool; registration alone does not put an item in inventory. Enemy registration alone does not change spawn composition. A `spawnRules`
entry references the enemy and assigns a fraction from 0 to 1. The sum of
registered chances cannot exceed 1. `spawnArchetype` checks cumulative ranges in
registration order using one roll, then alternates the registered
`spawnFallbacks`. Base rules reserve 0.1 each for Brute and Caster; the example
adds a 0.1 range without changing those ranges.
Classes reuse one of four art families; ability kinds are `slash`, `arrow`,
`fireball` and `roots`; enemy behaviors are `melee` and `ranged`. Arrow is piercing; other ability families are non-piercing. Roots abilities
and the roots ailment must be selected together. Class `details` optionally
provides weapon/spell labels and descriptions; omitted details use generic text.
Ailment, pickup, effect and critter identities, one Bear companion, scene families
and difficulty/type identities remain fixed.

For isolated tests call `createGame([baseMod, exampleMod])` and use that context's
`rules`. Selected combat helpers accept a context explicitly; live startup uses
the immutable default game. Server `createCharacterPersistence(context)` binds
save validation and class enumeration to the same context. Do not switch a global
catalog or assume every default-world helper accepts a custom context. Preserve
existing saved/wire IDs and use the [extension checks](../../../docs/plans/mods.md#verification).
