import type { TalentNode } from './talent-tree.ts';
import { TALENT_NAMES } from './talent-catalog.ts';
/** Tooltips describe total effects at each rank, never an extra permanent stat. */
export function talentDescription(node: Readonly<TalentNode>) {
  const names = TALENT_NAMES[node.classId];
  const ability = (column: number, tier: number) => {
    return names[column][tier * 2 + 1];
  };

  const wound =
    node.classId === 'warrior'
      ? 'Bleed'
      : node.classId === 'ranger'
        ? 'Poison'
        : node.classId === 'mage'
          ? 'Burn'
          : 'Roots';
  if (node.classId === 'druid' && node.column === 1) {
    return [
      'Every third Bear hit deals an additional 40% / 70% weapon damage.',
      'Command Bear to pounce at your target for 150% / 210% weapon damage. Requires a living Bear. 6s base cooldown.',
      'Bear hits have an additional 25% / 45% chance to apply one Bleed stack.',
      "While learned, doubles Bear's size and increases its claw range and maximum health by 30% at either rank. On cast, Bear heals for 20% / 30% of its maximum health and roots nearby ordinary enemies for 1.5s. Requires a living Bear. 10s base cooldown.",
      'Pack Howl also applies 1 / 2 Bleed stacks to nearby enemies.',
      'Bear strikes nearby enemies for 180% / 250% weapon damage and applies 1 / 2 Bleed stacks. 14s base cooldown.',
      'Bear hits against enemies affected by your Roots deal an additional 30% / 60% weapon damage.',
      'For five seconds, Bear deals 60% / 100% weapon damage to nearby enemies each second. 18s base cooldown.',
      'Every fifth Bear hit heals you for 2% / 4% of maximum health.',
      'Every fifth Bear hit cleaves nearby enemies for 60% / 100% weapon damage.',
    ][node.row];
  }

  if (node.column === 0) {
    return [
      'Every third basic weapon hit cleaves other nearby enemies for 40% / 70% weapon damage.',
      `Strike enemies around the aimed location for 150% / 210% weapon damage. Rank 2 expands the radius from 125 to 170 units. 6s base cooldown.`,
      `${ability(0, 0)} has a 25% / 50% chance to repeat after 0.3s for half damage. Repeats cannot repeat themselves.`,
      'Strike nearby enemies three times over one second for 45% / 65% weapon damage per hit. Rank 2 expands the radius from 125 to 170 units. 10s base cooldown.',
      `${ability(0, 1)} ends with a shockwave at the aimed location for 70% / 110% weapon damage.`,
      'Strike a targeted area for 150% / 210% weapon damage. Rank 2 expands the radius from 125 to 170 units. 14s base cooldown.',
      `${ability(0, 2)} leaves a four-second fissure. Your next first-tier ability detonates it for 90% / 150% weapon damage.`,
      'Strike the aimed enemy for 150% / 210% weapon damage, increased to 300% / 400% if it has less than 30% health. 18s base cooldown.',
      `A kill with ${ability(0, 3)} refunds 6s / 12s of its cooldown and empowers your next first-tier ability within six seconds with a 50% / 75% weapon-damage follow-up.`,
      'Hit with three different offensive abilities within six seconds to release a 100% / 160% weapon-damage shockwave. Can trigger once every eight seconds.',
    ][node.row];
  }

  if (node.column === 1) {
    return [
      node.classId === 'warrior'
        ? 'Add 20 / 35 percentage points to the existing weapon Bleed chance. A weapon with 10% Bleed chance becomes 30% / 45%.'
        : `Weapon hits have an additional 20% / 35% independent chance to apply ${wound}.`,
      `Strike the aimed area for 150% / 210% weapon damage and apply 2 / 3 ${wound} stacks. Rank 2 expands the radius. 6s base cooldown.`,
      `Direct first-column ability hits have a 25% / 45% chance to apply one ${wound} stack.`,
      `Hit an aimed enemy for 100% / 150% weapon damage, apply 2 / 3 ${wound} stacks and pull ordinary enemies toward you. Bosses cannot be pulled. 10s base cooldown.`,
      `${ability(1, 1)} spreads 1 / 2 ${wound} stacks to enemies near the pulled target.`,
      `Consume your ${wound} stacks on the aimed enemy to immediately deal 150% / 200% of their remaining whole-interval damage, including DOT Speed. Rank 2 splashes half the burst to nearby enemies. 14s base cooldown.`,
      `When an enemy dies with your damaging ailments, spread 1 / 2 fresh stacks to up to 2 / 4 nearby enemies.`,
      `Strike an aimed area four times over 1.5s, dealing 30% / 45% weapon damage and applying 2 / 3 ${wound} stacks each time. Rank 2 expands its radius. 18s base cooldown.`,
      `${ability(1, 2)} consuming at least three stacks leaves a six-second healing opportunity. The injured party member or Bear selected by Defensive Tactics (lowest health percentage by default) within 60 units heals for 3% / 5% maximum health, including you.`,
      'Your direct offensive ability hits against enemies with five of your ailment stacks have a 20% / 35% chance to deal 80% / 130% additional weapon damage. Two-second cooldown per target.',
    ][node.row];
  }

  return [
    node.classId === 'druid'
      ? 'Every fifth weapon hit heals you for 2% / 4% maximum health. Weapon hits can also prepare a reactive guard.'
      : 'Weapon hits have a 15% / 25% chance to prepare a three-second guard. The next incoming hit is reduced by 40% / 60%. Four-second trigger cooldown.',
    node.classId === 'druid'
      ? 'Heal the injured party member or Bear selected by Defensive Tactics (lowest health percentage by default) within 700 units for 12% / 20% of their maximum health, including yourself. 6s base cooldown.'
      : 'Strike nearby enemies for 90% / 140% weapon damage, interrupt attacks and stun ordinary enemies for 0.6s / 1s. 6s base cooldown.',
    `${ability(2, 0)} releases fragments into up to 2 / 4 enemies near the aimed location, dealing 35% / 50% weapon damage each.`,
    node.classId === 'druid'
      ? 'Create a six-second healing grove. Each second, heal the injured party member or Bear selected by Defensive Tactics (lowest health percentage by default) within 200 units for 2.5% / 4% of their maximum health, including yourself. 10s base cooldown.'
      : 'Create a six-second shelter. Nearby allies receive a refreshed barrier absorbing 6% / 10% of your maximum health. Barriers expire after 1.2s and do not add together. 10s base cooldown.',
    `${ability(2, 1)} also repeatedly immobilizes nearby ordinary enemies for 0.8s / 1.4s. Bosses are immune.`,
    'Gain a five-second barrier absorbing 15% / 25% maximum health. Interrupt nearby enemies and slow ordinary enemies. Rank 2 expands the affected area. 14s base cooldown.',
    'When your guard or barrier prevents damage, release a 60% / 100% weapon-damage counterwave. Two-second trigger cooldown.',
    node.classId === 'druid'
      ? 'Heal the injured party member or Bear selected by Defensive Tactics (lowest health percentage by default) within 700 units for 20% / 35% of their maximum health, including yourself. Reduce your incoming damage by 60% / 75% for 2s / 3s. 18s base cooldown.'
      : 'Reduce incoming damage by 60% / 75% for 2s / 3s. 18s base cooldown.',
    `${ability(2, 3)} also repeatedly shields nearby allies for 3% / 5% of their maximum health. Each barrier lasts one second and does not add together.`,
    node.classId === 'druid'
      ? 'A lethal hit leaves you at 15% / 25% maximum health instead. Can trigger once every 60s.'
      : `After ${ability(2, 3)} prevents damage, your next ${ability(2, 0)} releases an additional 45% / 112% weapon-damage impact.`,
  ][node.row];
}
