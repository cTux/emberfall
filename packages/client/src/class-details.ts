import { game } from '@emberfall/core';
export const classDetails = Object.fromEntries(
  game.registries.classes.values().map((player) => [
    player.id,
    player.details ?? {
      weapon: game.registries.items.require(player.starterWeapon).name,
      weaponDescription: 'Registered starter weapon.',
      spell: game.registries.abilities.require(player.attack).kind,
      spellDescription: 'Uses the registered ability and equipped weapon stats.',
    },
  ]),
);
