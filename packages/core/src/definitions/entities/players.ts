import { game } from '../../game.ts';
import { setting } from '../../content/views.ts';
export const PLAYER_DEFINITIONS = Object.freeze(
  Object.fromEntries(game.registries.classes.entries()),
);
export const CLASS_IDS = Object.freeze(game.registries.classes.values().map((player) => player.id));
export const CLASS_LABELS = Object.freeze(
  Object.fromEntries(game.registries.classes.values().map((player) => [player.id, player.label])),
);
export const INITIAL_PROGRESS =
  setting<typeof import('../../mods/base/entities/players.ts').INITIAL_PROGRESS>('initialProgress');
export const PLAYER_BODY_RADIUS = setting<number>('playerBodyRadius');
