/// <reference types="vite/client" />
declare const __BUILD_ID__: string;
declare const __GAME_VERSION__: string;

interface ImportMetaEnv {
  readonly BASE_API: string;
  readonly BASE_PORT: string;
}
