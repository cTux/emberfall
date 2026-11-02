import type { Parties } from './parties.ts';
import type { Player } from '@emberfall/core/contracts';

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
