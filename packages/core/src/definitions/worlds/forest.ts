import { game } from '../../game.ts';
import { setting } from '../../content/views.ts';
import type { Widen } from '../../content/contracts.ts';
export const FOREST_DEFINITION = game.registries.worlds.require('forest').value as Widen<
  typeof import('../../mods/base/worlds/forest.ts').FOREST_DEFINITION
>;
export const FOREST = FOREST_DEFINITION.geometry;
export const FOREST_PORTAL = FOREST_DEFINITION.portal;
export const LOBBY_PORTAL =
  setting<typeof import('../../mods/base/worlds/forest.ts').LOBBY_PORTAL>('lobbyPortal');
export const INTERACTION_RADIUS = setting<number>('interactionRadius');
