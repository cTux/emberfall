import { setting } from '../../content/views.ts';

export const ENEMY_RULES =
  setting<typeof import('../../mods/base/entities/enemies.ts').ENEMY_RULES>('enemyRules');
