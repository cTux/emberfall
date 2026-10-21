import { game } from '../../game.ts';
import { setting } from '../../content/views.ts';
export const ENEMY_STATS = Object.freeze(Object.fromEntries(game.registries.enemies.entries()));
export const ENEMY_RULES =
  setting<typeof import('../../mods/base/entities/enemies.ts').ENEMY_RULES>('enemyRules');
export const BOSS_DEFINITIONS = Object.freeze(Object.fromEntries(game.registries.bosses.entries()));
