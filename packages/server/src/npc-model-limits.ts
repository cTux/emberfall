// Retain the 32 KiB response budget; the same cap bounds decoded text length.
export const MAX_DIALOGUE_SIZE = 32_768;
// Give the local model the existing one-minute generation budget.
export const DEFAULT_TIMEOUT_MS = 60_000;
// Reject configurations occupying an inference slot for over five minutes.
export const MAX_TIMEOUT_MS = 300_000;
// Retain two concurrent generations to bound local inference load.
export const MAX_GENERATIONS = 2;
// Cap provider backoff at the existing fifteen-minute recovery window.
export const MAX_RETRY_DELAY_MS = 900_000;
// Wait at least thirty seconds after overload to avoid retry pressure.
export const MIN_RETRY_DELAY_MS = 30_000;
// Retry unavailable inference after the existing one-minute recovery pause.
export const FAILURE_RETRY_MS = 60_000;
