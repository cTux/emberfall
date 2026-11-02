import type { Parties } from './parties.ts';
import type { Player } from '@emberfall/common';
import { forestDistance, INTERACTION_RADIUS } from '@emberfall/core';

export function interactParty(
  parties: Parties,
  players: Map<string, Player>,
  player: Player,
  targetId: string,
  now: number,
) {
  const target = players.get(targetId);

  if (
    !target ||
    player.hitpoints <= 0 ||
    target.hitpoints <= 0 ||
    target.reconnecting ||
    player.scene !== target.scene ||
    (player.scene && parties.key(player) !== parties.key(target)) ||
    forestDistance(player, target) >= INTERACTION_RADIUS
  ) {
    throw new Error('Move closer to that player.');
  }

  if (
    parties.incoming(player, now).some((r) => {
      return r.fromId === targetId;
    })
  ) {
    parties.accept(player, targetId, now);
  } else {
    parties.request(player, target, now);
  }
}
