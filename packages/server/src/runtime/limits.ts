// Fifteen seconds tolerates brief network stalls while bounding dead-connection retention.
export const HEARTBEAT_INTERVAL_MS = 15_000;
// Playtime is stored in whole seconds, so each increment represents one second.
export const PLAYTIME_INTERVAL_MS = 1000;
// Keep at most five simulation ticks of backlog to avoid a catch-up spiral after a stall.
export const MAX_SIMULATION_BACKLOG_MS = 250;
// Poll faster than the 50 ms simulation tick so ordinary timer jitter can be caught up.
export const SIMULATION_POLL_MS = 10;
// Preserve the existing server capacity budget; this is a tuning limit, not a measured maximum.
export const MAX_SESSIONS = 256;
// Preserve the existing world budget, including the permanent village world.
export const MAX_WORLDS = 64;
// The shared village admits more players than an eight-player private world.
export const VILLAGE_CAPACITY = 32;
// Bound expensive admission work to five attempts per ten-second window per connection.
export const ADMISSION_WINDOW_MS = 10_000;
// Five attempts allow retries while limiting password-derivation work from one connection.
export const MAX_ADMISSION_ATTEMPTS = 5;
// Preserve the existing global password-work budget; benchmark before increasing concurrency.
export const MAX_PENDING_PASSWORDS = 8;
// Retain 128 bits of random salt in the persisted world-password format.
export const PASSWORD_SALT_BYTES = 16;
// Retain the 256-bit scrypt output expected by existing persisted world hashes.
export const PASSWORD_HASH_BYTES = 32;
// Two seconds of 50 ms inputs bounds queued movement work after network delays.
export const MAX_QUEUED_INPUTS = 40;
// A half-second cooldown permits two chat/party interactions per second.
export const CHAT_COOLDOWN_MS = 500;
// Preserve the slow-peer cutoff in decimal bytes; changing it alters disconnect behavior.
export const MAX_BUFFERED_BYTES = 128_000;
// Rate-limit messages over one second, independently of the admission window.
export const MESSAGE_WINDOW_MS = 1000;
// Preserve headroom for movement/control messages while bounding per-peer command work.
export const MAX_MESSAGES_PER_WINDOW = 80;
// Legacy validation requires a 64-character hexadecimal token, even for account-owned joins.
export const LEGACY_TOKEN_HEX_LENGTH = 64;
