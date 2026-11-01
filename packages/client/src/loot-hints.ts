import type { BackpackItem } from '@emberfall/common';

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

export interface LootHint {
  itemId: string;
  quantity: number;
  at: number;
}

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

/** Only confirmed inventory is observed; remounts start with a silent baseline. */
export class LootHints {
  private previous?: Map<string, number>;
  hints: LootHint[] = [];

  observe(items: readonly BackpackItem[] | undefined, enabled: boolean, now: number) {
    if (!items) {
      this.previous = undefined;
      this.hints = [];

      return;
    }

    const totals = new Map<string, number>();

    for (const item of items) {
      totals.set(item.itemId, (totals.get(item.itemId) ?? 0) + item.quantity);
    }

    this.hints = enabled
      ? this.hints.filter((hint) => {
          return lootHintFrame(hint.at, now);
        })
      : [];

    if (enabled && this.previous) {
      for (const [itemId, total] of totals) {
        const quantity = total - (this.previous.get(itemId) ?? 0);

        if (quantity > 0) {
          this.hints.push({ itemId, quantity, at: now });
        }
      }
    }

    this.previous = totals;
  }
}
