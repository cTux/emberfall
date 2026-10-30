export interface SteamOptions {
  origin: string;
  apiKey: string;
  /** Full client landing URL, including a GitHub Pages repository path. */
  clientUrl?: string;
  /** Dependency injection for isolated provider tests; never exposed over HTTP. */
  request?: typeof fetch;
}
export function steamOptionsFromEnv(): SteamOptions {
  const origin = process.env.STEAM_ORIGIN;
  const apiKey = process.env.STEAM_WEB_API_KEY;
  if (!origin || !apiKey)
    throw new Error('Set STEAM_ORIGIN and STEAM_WEB_API_KEY to enable Steam login.');
  return { origin, apiKey, clientUrl: process.env.CLIENT_URL };
}
export function accountOrigins(options: Pick<SteamOptions, 'origin' | 'clientUrl'>) {
  const origin = new URL(options.origin);
  if (origin.protocol !== 'https:' || origin.origin !== options.origin)
    throw new Error('STEAM_ORIGIN must be an HTTPS origin without a path or trailing slash.');
  const canonicalOrigin = origin.origin;
  let clientUrl: string | undefined;
  let clientOrigin: string;
  if (options.clientUrl) {
    const client = new URL(options.clientUrl);
    if (
      client.protocol !== 'https:' ||
      client.username ||
      client.password ||
      client.search ||
      client.hash
    )
      throw new Error(
        'CLIENT_URL must be an HTTPS landing URL without credentials, query or fragment.',
      );
    clientUrl = client.toString();
    clientOrigin = client.origin;
  } else clientOrigin = canonicalOrigin;
  return { origin: canonicalOrigin, clientOrigin, clientUrl };
}
