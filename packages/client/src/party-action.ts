import type { Player } from '@emberfall/common';

export function partyAction(
  world: import('@emberfall/common').WorldState | null | undefined,
  player: Player | undefined,
  target: Player,
) {
  if (
    !world ||
    !player ||
    player.hitpoints <= 0 ||
    player.reconnecting ||
    target.id === player.id ||
    target.scene !== player.scene ||
    (target.scene && target.runId !== player.runId) ||
    target.hitpoints <= 0 ||
    target.reconnecting
  ) {
    return null;
  }

  return world.partyRequests?.some((r) => {
    return r.fromId === target.id;
  })
    ? 'Accept'
    : !player.partyId && target.partyId
      ? 'Join party'
      : !target.partyId && (!player.partyId || player.partyLeaderId === player.id)
        ? 'Invite to party'
        : null;
}
