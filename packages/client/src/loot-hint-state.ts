import type { LootHint } from './loot-hint-definition.ts';
import { lootHintFrame } from './loot-hint-frame.ts';
import type { BackpackItem } from '@emberfall/common';

// Existing pickup feedback enters quickly, holds for readability, then collapses/fades within a fixed 2.1 seconds.

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
