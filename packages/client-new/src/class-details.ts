import type { ClassId } from "@emberfall/common-new";

const ailment = (name: string) =>
  `Hits have a 10% chance to apply ${name}. Each stack deals 1 damage per second for 5 seconds; new stacks refresh the duration.`;
export const classDetails: Record<
  ClassId,
  { weapon: string; weaponDescription: string; spell: string; spellDescription: string }
> = {
  warrior: {
    weapon: "Sword",
    weaponDescription:
      "A close-range sword. Its starting attack is Slash, hitting enemies in a forward half-disc.",
    spell: "Slash",
    spellDescription: `Deal 5 damage to each enemy struck, once per swing. Range: 88 units. Active swing: 0.26 seconds. Cooldown: 1 second. ${ailment("Bleed")}`,
  },
  ranger: {
    weapon: "Bow",
    weaponDescription:
      "A ranged bow. Its starting attack fires two piercing arrows in a small spread.",
    spell: "Piercing arrows",
    spellDescription: `Fire two arrows, each dealing 5 damage to every enemy it pierces. Travel range: 1,000 units. Cooldown: 1 second. ${ailment("Poison")}`,
  },
  mage: {
    weapon: "Staff",
    weaponDescription:
      "A magical staff. Its starting spell sends out two fireballs that explode on impact.",
    spell: "Fireball",
    spellDescription: `Fire two projectiles. Each deals 3 damage to its direct target and 1 damage to other enemies within 100 units. Range: 250 units with auto-target, 1,000 with cursor aim. Cooldown: 1 second. ${ailment("Burn")}`,
  },
  druid: {
    weapon: "Staff",
    weaponDescription:
      "A nature staff. Its starting spell fires two root projectiles. The Druid also has a permanent companion named Bear.",
    spell: "Roots",
    spellDescription:
      "Fire two projectiles; each bounces once to the nearest other enemy. Both hits deal full power. Roots slow ordinary enemies by 10% for 5 seconds with one stack; hits refresh the duration. Bosses take damage but are immune to roots. Range: 250 units with auto-target, 1,000 with cursor aim. Cooldown: 1 second. Bear has 1.5× your maximum HP and claws for 2 damage per enemy per swing. It returns after 5 seconds when defeated.",
  },
};
