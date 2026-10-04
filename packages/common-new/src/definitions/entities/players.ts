// Player bodies are 70% of the original collision radii; artwork stays full size.
export const PLAYER_BODY_RADIUS = 12 * 0.7;
export const PLAYER_PROJECTILE_HIT_RADIUS = 17 * 0.7;

export const CLASS_IDS = ["warrior", "ranger", "mage", "druid"] as const;
export const CLASS_LABELS = {
  warrior: "Warrior",
  ranger: "Ranger",
  mage: "Mage",
  druid: "Druid",
} as const;
export const PLAYER_DEFINITIONS = {
  warrior: {
    id: "warrior",
    label: "Warrior",
    attack: "slash",
    ailment: "bleed",
    sprite: "/assets/knight.png",
  },
  ranger: {
    id: "ranger",
    label: "Ranger",
    attack: "arrow",
    ailment: "poison",
    sprite: "/assets/ranger.png",
  },
  mage: {
    id: "mage",
    label: "Mage",
    attack: "fireball",
    ailment: "burn",
    sprite: "/assets/mage.png",
  },
  druid: {
    id: "druid",
    label: "Druid",
    attack: "roots",
    ailment: "roots",
    sprite: "/assets/druid.png",
    companion: "bear",
  },
} as const;
export const INITIAL_PROGRESS = {
  level: 1,
  experience: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  manapoints: 50,
  maxManapoints: 50,
  playtimeSeconds: 0,
  talents: {},
} as const;
