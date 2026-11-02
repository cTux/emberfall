// Existing pickup feedback enters quickly, holds for readability, then collapses/fades within a fixed 2.1 seconds.
const LOOT_HINT = {
  lifetimeMs: 2100,
  enterMs: 200,
  exitAtMs: 1200,
  exitMs: 900,
  enterOffset: 16,
  exitOffset: 18,
  rowHeight: 20,
} as const;
export function lootHintFrame(at: number, now: number) {
  const age = now - at;

  if (age < 0 || age >= LOOT_HINT.lifetimeMs) {
    return undefined;
  }

  const enter = Math.min(1, age / LOOT_HINT.enterMs);
  const exit = Math.max(0, (age - LOOT_HINT.exitAtMs) / LOOT_HINT.exitMs);

  return {
    alpha: enter * (1 - exit),
    offset: LOOT_HINT.enterOffset * (1 - enter) ** 3 - LOOT_HINT.exitOffset * exit,
    height: LOOT_HINT.rowHeight * enter * (1 - exit),
  };
}
