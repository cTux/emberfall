// Bound retained errors while preserving enough failure evidence.
export const MAX_ERRORS = 20;
// Allow fifteen seconds for admission under concurrent startup load.
export const ADMISSION_TIMEOUT_MS = 15000;
// Retain twenty input samples per direction cycle for comparable workload motion.
export const ROTATION_SAMPLES = 20;
// Require five real saves per player to measure repeated persistence work.
export const MIN_AUTOSAVES = 5;
// Select the ninety-fifth percentile for p95 reporting.
export const P95_QUANTILE = 0.95;
// Convert millisecond clocks to per-second throughput.
export const MILLISECONDS_PER_SECOND = 1000;
// A second without snapshots fails the live-workload requirement.
export const MAX_SNAPSHOT_AGE_MS = 1000;
