import type { SteamOptions } from './steam-options.ts';

export function steamOptionsFromEnv(): SteamOptions {
  const origin = process.env.STEAM_ORIGIN;
  const apiKey = process.env.STEAM_WEB_API_KEY;

  if (!origin || !apiKey) {
    throw new Error('Set STEAM_ORIGIN and STEAM_WEB_API_KEY to enable Steam login.');
  }

  return { origin, apiKey, clientUrl: process.env.CLIENT_URL };
}
