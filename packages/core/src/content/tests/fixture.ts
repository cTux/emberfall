import type { GameMod } from '../contracts.ts';
import { game } from '../../game.ts';

/** Uses the same public registration interface as a bundled mod. */
export const extensionMod: GameMod = {
  id: 'fixture',
  register(r) {
    r.gearTypes.register({ id: 'fixture:charm', label: 'Charm' });
    r.items.register({
      id: 'fixture:charm',
      name: 'Lucky charm',
      kind: 'gear',
      gearType: 'fixture:charm',
      stats: { 'fixture:luck': 7, armor: 10 },
      price: 4,
    });
    r.slots.register({
      id: 'fixture:charm',
      label: 'Charm',
      gearTypes: ['fixture:charm'],
      column: 2,
      row: 5,
    });
    // Forward stat reference above is resolved only after every mod registers.
    r.stats.register({
      id: 'fixture:luck',
      label: 'Luck',
      default: 2,
      aggregation: 'sum',
      format: 'number',
    });
    r.abilities.register({
      ...game.registries.abilities.require('arrow'),
      id: 'fixture:bolt',
      count: 3,
      durationMs: 100,
      aimSmoothingSeconds: 0.2,
      speed: 120,
      spreadRadians: 0.2,
    });
    r.classes.register({
      id: 'fixture:scout',
      label: 'Scout',
      details: {
        weapon: 'Bow',
        weaponDescription: 'Test bow',
        spell: 'Scout bolt',
        spellDescription: 'Test bolt',
      },
      art: 'ranger',
      sprite: '/assets/ranger.png',
      attack: 'fixture:bolt',
      ailment: 'poison',
      starterWeapon: 'ranger-bow',
      gearTypes: ['bow', 'quiver'],
    });
    r.enemies.register({
      ...game.registries.enemies.require('skeleton'),
      id: 'fixture:giant',
      art: 'brute',
      behavior: 'melee',
      size: 80,
      radius: 20,
      speed: 20,
      hitPoints: 75,
      damage: 12,
    });
    r.spawnRules.register({ id: 'fixture:giant', enemy: 'fixture:giant', chance: 0.2 });
  },
};
