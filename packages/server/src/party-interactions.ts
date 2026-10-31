import type { Player } from '@emberfall/common';
import { forestDistance, INTERACTION_RADIUS } from '@emberfall/core';
import type { Parties } from './parties.ts';

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

export function partyCommand(
  parties: Parties,
  players: Map<string, Player>,
  player: Player,
  text: string,
  now: number,
) {
  const [command, raw, ...extra] = text.trim().split(/\s+/);

  if (extra.length || (command === '/leave' && raw)) {
    throw new Error('Invalid party command.');
  }

  const name = raw?.replace(/^@/, '');
  const matches = name
    ? [...players.values()].filter((p) => {
        return p.name.toLowerCase() === name.toLowerCase();
      })
    : [];

  if (name && matches.length !== 1) {
    throw new Error('Player name was not found or is ambiguous.');
  }

  if (command === '/leave') {
    parties.leave(player);
  } else if (command === '/party' && matches.length === 1) {
    parties.request(player, matches[0], now);
  } else if (command === '/accept') {
    parties.accept(player, matches[0]?.id, now);
  } else {
    throw new Error('Use /party @name, /accept [@name] or /leave.');
  }
}
