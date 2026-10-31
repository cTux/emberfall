import { PICKUP_DEFINITIONS, PICKUP_RULES } from '../definitions/entities/pickups.ts';
import { wrappedDelta, wrap } from '@emberfall/common';
import { FOREST, forestDistance } from '../scene.ts';
import { addItem, INVENTORY_SLOTS } from '../inventory.ts';
import type { Player, SceneState } from '@emberfall/common';

export function tickPickups(scene: SceneState, players: Player[], now: number, dt: number) {
  const collectors = players.filter(
    (p) => p.scene === 'forest' && p.hitpoints > 0 && !p.reconnecting,
  );
  scene.drops = (scene.drops ?? []).filter((drop) => {
    if (now - drop.at >= PICKUP_RULES.lifetimeMs) return false;
    if (now - drop.at < PICKUP_RULES.initialHopMs) return true;
    let target: Player | undefined;
    let distance = PICKUP_RULES.attractionRadius;
    for (const player of collectors) {
      if (
        drop.kind === 'item' &&
        (player.autoLoot === false || (player.backpack?.length ?? 0) >= INVENTORY_SLOTS)
      )
        continue;
      const next = forestDistance(player, drop);
      if (next < distance) {
        target = player;
        distance = next;
      }
    }
    drop.collectorId = target?.id;
    if (!target) return true;
    const travel = Math.min(distance, PICKUP_RULES.speed * Math.max(0, dt));
    if (distance <= PICKUP_RULES.collectRadius || distance - travel <= PICKUP_RULES.collectRadius) {
      if (drop.kind === 'experience')
        for (const player of collectors) player.experience += drop.amount ?? 1;
      else if (drop.kind === 'item' && drop.itemId)
        addItem((target.backpack ??= []), {
          id: `${scene.id}:${drop.id}`,
          itemId: drop.itemId,
          quantity: 1,
          rarity: drop.rarity,
          stats: drop.stats,
        });
      else
        target.coins = Math.min(
          Number.MAX_SAFE_INTEGER,
          (target.coins ?? 0) + PICKUP_DEFINITIONS.gold.baseAmount,
        );
      return false;
    }
    drop.x = wrap(
      drop.x + (wrappedDelta(target.x, drop.x, FOREST.width) * travel) / distance,
      FOREST.width,
    );
    drop.y = wrap(
      drop.y + (wrappedDelta(target.y, drop.y, FOREST.height) * travel) / distance,
      FOREST.height,
    );
    return true;
  });
}
