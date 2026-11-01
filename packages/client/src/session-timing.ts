// Preserve two-second latency probes without sending a ping on every server tick.
export const LATENCY_PROBE_INTERVAL_MS = 2000;
// A three-second version deadline bounds reconnect waits when static hosting is unavailable.
export const VERSION_REQUEST_TIMEOUT_MS = 3000;
// Application close code requests retry rather than treating version-fetch failure as a policy ban.
export const VERSION_RETRY_CLOSE_CODE = 3001;
// The legacy wire schema expects a 64-character hex token even on account-owned resume requests.
export const LEGACY_CHARACTER_TOKEN_LENGTH = 64;

// Subsequent retries wait one second; the first disconnected retry is deliberately immediate.
export const RECONNECT_DELAY_MS = 1000;
