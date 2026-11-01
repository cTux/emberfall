import { gameVersion } from '../../../scripts/game-version.ts';

declare const __GAME_VERSION__: string;

// Production embeds the version at build time; source-mode servers resolve it once at startup.
export const GAME_VERSION = typeof __GAME_VERSION__ === 'string' ? __GAME_VERSION__ : gameVersion();
