import type { BackpackItem } from '@emberfall/common';

export interface LootHint {
  itemId: string;
  quantity: number;
  at: number;
}

export function lootHintFrame(at: number, now: number) {
  const age = now - at;

  if (age < 0 || age >= 2100) {
    return undefined;
  }

  const enter = Math.min(1, age / 200);
  const exit = Math.max(0, (age - 1200) / 900);

  return {
    alpha: enter * (1 - exit),
    offset: 16 * (1 - enter) ** 3 - 18 * exit,
    height: 20 * enter * (1 - exit),
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
