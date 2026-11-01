export const ACCOUNT_LIMITS = {
  // Seven days is the existing persistent sign-in lifetime; retain session/cookie expiry parity.
  sessionLifetimeMs: 604_800_000,
  // Five minutes gives an interactive Steam sign-in time to return before its CSRF state expires.
  loginLifetimeMs: 300_000,
  // Admission tickets are single-use and short-lived; retain the existing thirty-second replay window.
  ticketLifetimeMs: 30_000,
  // The existing one-minute window bounds requests independently from credential expiry.
  rateWindowMs: 60_000,
  // Recheck expired sessions every second to keep connected peers close to persisted session validity.
  sweepIntervalMs: 1000,
  // Preserve the existing per-map memory budget, not a measured server capacity.
  maxRecords: 5000,
  // Preserve twenty login starts per IP per minute to allow retries while bounding external work.
  loginsPerWindow: 20,
  // Preserve thirty account mutations per minute independently from login throttling.
  accountRequestsPerWindow: 30,
  // Preserve the existing eight-request external verification concurrency budget.
  maxPendingVerifications: 8,
  // Thirty-two random bytes retain 256-bit opaque credentials before hexadecimal encoding.
  credentialBytes: 32,
} as const;
