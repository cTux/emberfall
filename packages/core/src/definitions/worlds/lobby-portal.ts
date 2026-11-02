import { setting } from '../../content/views.ts';

export const LOBBY_PORTAL =
  setting<typeof import('../../mods/base/worlds/forest.ts').LOBBY_PORTAL>('lobbyPortal');
