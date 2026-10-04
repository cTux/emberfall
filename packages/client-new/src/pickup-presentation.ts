import { FOREST, wrap, wrappedDelta } from "@emberfall/common-new";
import { PICKUP_RULES } from "@emberfall/common-new/definitions/entities/pickups";
import type { Player, WorldState } from "@emberfall/common-new";

/** Adjust detached render drops only. Selection, removal and rewards stay authoritative. */
export function alignLocalPickups(view: WorldState, local: Player) {
  if (local.scene !== "forest" || local.hitpoints <= 0) return;
  const buffered = view.players.find((p) => p.id === local.id);
  if (!buffered || buffered.scene !== local.scene) return;
  const dx = wrappedDelta(local.x, buffered.x, FOREST.width);
  const dy = wrappedDelta(local.y, buffered.y, FOREST.height);
  for (const drop of view.scene?.drops ?? []) {
    if (drop.collectorId !== local.id) continue;
    const distance = Math.hypot(
      wrappedDelta(drop.x, buffered.x, FOREST.width),
      wrappedDelta(drop.y, buffered.y, FOREST.height),
    );
    const blend = Math.max(
      0,
      Math.min(
        1,
        (PICKUP_RULES.attractionRadius - distance) /
          (PICKUP_RULES.attractionRadius - PICKUP_RULES.collectRadius),
      ),
    );
    drop.x = wrap(drop.x + dx * blend, FOREST.width);
    drop.y = wrap(drop.y + dy * blend, FOREST.height);
  }
}
