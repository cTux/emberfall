import { partyAction } from './party-action.ts';
import type { Player } from '@emberfall/core/contracts';
import type { Interaction } from './effects';
import { forestDistance, INTERACTION_RADIUS } from '@emberfall/core';

export function partyInteraction(
  world: import('@emberfall/core/contracts').WorldState | null | undefined,
  player: Player | undefined,
): Interaction | null {
  if (!world || !player || player.hitpoints <= 0 || player.reconnecting) {
    return null;
  }

  const candidates = world.players.filter((p) => {
    return (
      p.id !== player.id &&
      p.scene === player.scene &&
      (!p.scene || p.runId === player.runId) &&
      p.hitpoints > 0 &&
      !p.reconnecting &&
      forestDistance(player, p) < INTERACTION_RADIUS
    );
  });
  candidates.sort((a, b) => {
    return forestDistance(player, a) - forestDistance(player, b);
  });

  for (const target of candidates) {
    const name = partyAction(world, player, target);

    if (name) {
      return { id: `party:${target.id}`, name, x: target.x, y: target.y };
    }
  }

  return null;
}
