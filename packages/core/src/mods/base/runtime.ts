export const RUNTIME = {
  // Fifty milliseconds retains the shared 20 Hz authoritative/predicted simulation cadence.
  tickMs: 50,
  // Eight is the existing private-world party budget; it is not a measured server capacity.
  maxPlayers: 8,
  // Send only the latest ten entries in the existing chat snapshot window.
  chatLimit: 10,
  // Match the fixed 200-character wire command ceiling.
  chatMaxLength: 200,
  // A five-second interval bounds ordinary unsaved progress without saving on every tick.
  autosaveMs: 5000,
  // Retain live characters for the existing ten-second temporary-disconnect grace period.
  reconnectMs: 10000,
  // Bound speculative movement to the existing one-second horizon between confirmations.
  predictionLimitMs: 1000,
  // Version one identifies the current wire contract; changes require coordinated clients.
  protocolVersion: 1,
} as const;
