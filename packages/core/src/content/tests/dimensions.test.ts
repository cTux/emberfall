import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame } from '../../game.ts';
import { GAME_MODS, baseMod } from '../../mods/index.ts';
import { dimensionsMod } from '../../mods/dimensions.mod.ts';
import { DIMENSIONS } from '../../mods/dimensions/definitions.ts';
import type { GameMod } from '../contracts.ts';

test('dimension catalogs reject missing references, invalid modifiers and unsupported skills', () => {
  for (const change of [
    { enemyMultiplier: 0 },
    { rarityMultiplier: -1 },
    { enemies: ['missing'] },
    { boss: 'missing' },
    { resources: { ...DIMENSIONS.swamp.resources, plant: 'missing' } },
  ]) {
    const mod: GameMod = {
      id: 'invalid-dimensions',
      register(r) {
        dimensionsMod.register({
          ...r,
          settings: {
            register(entry) {
              r.settings.register({
                ...entry,
                value: { ...DIMENSIONS, swamp: { ...DIMENSIONS.swamp, ...change } },
              });
            },
          },
        });
      },
    };
    assert.throws(() => {
      createGame([baseMod, mod]);
    }, /invalid-dimensions/);
  }

  const brokenSkill: GameMod = {
    id: 'broken-skill',
    register(r) {
      r.enemies.register({
        id: 'broken',
        art: 'caster',
        behavior: 'ranged',
        speed: 1,
        radius: 1,
        size: 1,
        reach: 1,
        windup: 1,
        cooldown: 1,
        hitPoints: 1,
        damage: 1,
        skill: { name: 'Too many', kind: 'volley', count: 9, spread: 1 },
      });
    },
  };
  assert.throws(() => {
    createGame([...GAME_MODS, brokenSkill]);
  }, /broken-skill/);
});
