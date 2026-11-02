export interface SteamOptions {
  origin: string;
  apiKey: string;
  /** Full client landing URL, including a GitHub Pages repository path. */
  clientUrl?: string;
  /** Dependency injection for isolated provider tests; never exposed over HTTP. */
  request?: typeof fetch;
}
