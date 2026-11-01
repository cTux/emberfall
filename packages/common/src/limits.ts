/** Existing wire/save bounds; keep these stable when adding content IDs. */
export const CONTRACT_LIMITS = {
  // World/player labels retain the existing short-label budget used by legacy clients.
  nameCharacters: 24,
  // Passwords retain the existing admission budget rather than allowing unbounded hash inputs.
  passwordCharacters: 64,
  // Instance, epoch, node and stat IDs retain their existing bounded wire representation.
  instanceIdCharacters: 64,
  // Registered content and equipment-slot IDs allow the longer namespaced representation.
  contentIdCharacters: 128,
  // Rarity IDs retain their smaller existing save-field budget.
  rarityIdCharacters: 32,
  // Chat is bounded to the existing short-message size before broadcast and persistence.
  chatCharacters: 200,
  // Four equipped talent slots are part of the current command/save layout.
  talentSlots: 4,
  // Three named storage tabs are part of the current command/save layout.
  storageTabs: 3,
  // Retain the existing validation ceiling so old saves keep the same acceptance rules.
  characterLevel: 10_000,
  // Each timed movement command covers at most one existing 50 ms simulation tick.
  movementDurationMs: 50,
  // The trade command's existing bulk option represents ten items, distinct from a full stack.
  tradeBundleQuantity: 10,
} as const;
