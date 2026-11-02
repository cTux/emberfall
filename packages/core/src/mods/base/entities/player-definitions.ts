export const PLAYER_DEFINITIONS = {
  warrior: {
    id: 'warrior',
    label: 'Warrior',
    attack: 'slash',
    ailment: 'bleed',
    sprite: '/assets/knight.png',
  },
  ranger: {
    id: 'ranger',
    label: 'Ranger',
    attack: 'arrow',
    ailment: 'poison',
    sprite: '/assets/ranger.png',
  },
  mage: {
    id: 'mage',
    label: 'Mage',
    attack: 'fireball',
    ailment: 'burn',
    sprite: '/assets/mage.png',
  },
  druid: {
    id: 'druid',
    label: 'Druid',
    attack: 'roots',
    ailment: 'roots',
    sprite: '/assets/druid.png',
    companion: 'bear',
  },
} as const;
