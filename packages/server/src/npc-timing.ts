// Retain existing pacing so dialogue does not monopolize villagers or inference slots.
export const NPC_TIMING = {
  // Ten seconds lets initial world admission settle before ambient speech.
  initialTalkDelayMs: 10_000,
  // Ten seconds prevents repeated requests to the same player.
  playerReplyCooldownMs: 10_000,
  // Three minutes gives each resident a turn before repeating ambient speech.
  npcAmbientCooldownMs: 180_000,
  // Calibrated distance at which nearby players can hear replies.
  playerRange: 120,
  // Residents converse across a wider range than player replies.
  npcRange: 160,
  // Two seconds leaves a readable pause before a scheduled response.
  replyDelayMs: 2000,
  // Five seconds separates successful requests and participant cooldowns.
  exchangeCooldownMs: 5000,
  // A minute limits request pressure while an unavailable provider recovers.
  failureRetryMs: 60_000,
  // Ninety seconds spaces ambient conversations between active players.
  ambientCooldownMs: 90_000,
  // Four minutes prevents repeatedly initiating speech at one player.
  playerAmbientCooldownMs: 240_000,
  // Half a second schedules the next exchange after publishing speech.
  continuationDelayMs: 500,
  // Five lines bounds an NPC exchange before yielding to other residents.
  maxExchangeLines: 5,
} as const;
