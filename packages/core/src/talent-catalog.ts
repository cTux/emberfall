/** Stable per-class node IDs; atlas cells use column * 10 + row. */
// PROG-03 unlocks a first point immediately, then one row every two normal levels through 18.
export const TALENT_LEVELS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18] as const;
// PROG-03 alternates extensions and abilities; these row IDs are also persisted in loadouts.
export const TALENT_ABILITY_ROWS: readonly number[] = [1, 3, 5, 7];
// Four abilities per column preserve the existing slot IDs used by the ability registry.
export const TALENT_ABILITIES_PER_COLUMN = 4;
// PROG-03 permits one base rank and one improved rank for each node.
export const TALENT_MAX_RANK = 2;
// PROG-03 gives four independently assignable action slots, retained in character saves.
export const TALENT_ACTION_SLOTS = 4;
// Normal levels grant talent points through level 20; paragon grants no extra points.
export const TALENT_POINT_CAP = 20;
// Version two identifies the current tree layout; older allocations must be refunded.
export const TALENT_VERSION = 2;
// The third column owns defensive/restoration mechanics; its zero-based ID is saved in node IDs.
export const TALENT_DEFENSIVE_COLUMN = 2;
// The third and fourth active tiers retain their stable zero-based registry coordinates.
export const TALENT_THIRD_TIER = 2;
// The final active tier is index three in each four-ability column; preserve registered slot IDs.
export const TALENT_FINISHER_TIER = 3;
// These saved active slots perform restoration healing checks before automatic casting.
export const TALENT_HEALING_SLOTS: readonly number[] = [8, 9, 11];
// The middle restoration heal is the shelter/grove, whose reach is smaller than direct heals.
export const TALENT_SHELTER_SLOT = 9;
export const TALENT_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  warrior: ['Weapon Mastery', 'Bloodletting', 'Guardian'],
  ranger: ['Marksmanship', 'Venom', 'Survival'],
  mage: ['Fire', 'Arcane', 'Frost Ward'],
  druid: ['Nature Magic', 'Beastbond', 'Restoration'],
};
export const TALENT_NAMES: Readonly<Record<string, readonly (readonly string[])[]>> = {
  warrior: [
    [
      'Follow Through',
      'Cleaving Strike',
      'Second Impact',
      'Whirlwind',
      'Advancing Storm',
      'Earthshatter',
      'Fault Lines',
      'Execution',
      'Killing Momentum',
      'Battle Rhythm',
    ],
    [
      'Open Wounds',
      'Rending Slash',
      'Serrated Edge',
      'Bloodhook',
      'Trailing Blood',
      'Rupture',
      'Contagious Wounds',
      'Crimson Cyclone',
      'Blood Offering',
      'Deep Cuts',
    ],
    [
      'Reactive Guard',
      'Shield Bash',
      'Shield Fragments',
      'Rallying Banner',
      'Hold the Line',
      'Challenge',
      'Reprisal',
      'Shield Wall',
      'Shared Shelter',
      'Unbroken',
    ],
  ],
  ranger: [
    [
      'Steady Rhythm',
      'Piercing Volley',
      'Splintering Shafts',
      'Ricochet Shot',
      'Crossfire',
      'Rain of Arrows',
      'Marked Quarry',
      'Heartseeker',
      'Clean Finish',
      'Perfect Sequence',
    ],
    [
      'Toxic Tips',
      'Venom Volley',
      'Leaking Quiver',
      'Poison Flask',
      'Toxic Ground',
      'Catalyst',
      'Plague Carrier',
      'Serpent Nest',
      'Antidote',
      'Virulent Reaction',
    ],
    [
      'Evasive Instinct',
      'Repelling Shot',
      'Scattershot',
      'Shelter Trap',
      'Snaring Wire',
      'Decoy',
      'Spiked Defenses',
      'Wind Screen',
      'Shared Cover',
      'Countershot',
    ],
  ],
  mage: [
    [
      'Kindling',
      'Flame Burst',
      'Twin Embers',
      'Firestorm',
      'Rolling Flame',
      'Meteor',
      'Molten Ground',
      'Phoenix Flare',
      'Ashes to Ashes',
      'Combustion',
    ],
    [
      'Resonance',
      'Arcane Lance',
      'Spell Echo',
      'Prismatic Orb',
      'Refraction',
      'Arcane Collapse',
      'Unstable Magic',
      'Astral Cascade',
      'Residual Energy',
      'Convergence',
    ],
    [
      'Ice Shards',
      'Frost Nova',
      'Shattering Ice',
      'Ice Ward',
      'Frozen Perimeter',
      'Mirror Image',
      'Frostbite',
      'Glacial Wall',
      'Winter Shelter',
      'Cold Reversal',
    ],
  ],
  druid: [
    [
      'Living Thorns',
      'Thorn Spear',
      'Forked Growth',
      'Vine Chain',
      'Overgrowth',
      'Moonfall',
      'Lunar Bloom',
      'Wild Tempest',
      'Seed of Renewal',
      'Natural Cycle',
    ],
    [
      'Predatory Bond',
      'Pounce',
      'Raking Claws',
      'Pack Howl',
      'Hunting Ground',
      'Savage Rush',
      'Shared Prey',
      'Primal Awakening',
      'Life Bond',
      'Pack Instinct',
    ],
    [
      'Budding Life',
      'Mending Seed',
      'Overflow',
      'Healing Grove',
      'Grasping Sanctuary',
      'Barkskin',
      'Thorn Shelter',
      'Renewal',
      'Shared Roots',
      'Rebirth',
    ],
  ],
};

export function talentNodeId(classId: string, column: number, row: number) {
  return `v${TALENT_VERSION}:${classId}:${column}:${row}`;
}
