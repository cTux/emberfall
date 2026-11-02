import type { Messages } from './messages.ts';
import type { CommandType } from './command-type.ts';
import { commitCharacterCommand } from './commit-character-command.ts';
import type { CommandContext, Snapshot } from '../runtime/models.ts';
import type { CharacterStore } from '../characters.ts';
import type { WorldMembership } from '../runtime/world-membership.ts';
import {
  anvilInRange,
  nearbyInteraction,
  traderInRange,
  BULLSEYE,
  forestDistance,
  INTERACTION_RADIUS,
} from '@emberfall/core';

export function executeCharacterCommand(
  message: Messages[CommandType],
  { session, world, now, reply, error }: CommandContext,
  characters: Pick<CharacterStore, 'merchant' | 'save'>,
  villageLife: WorldMembership['villageLife'],
  state: Snapshot,
) {
  const trading = message.type === 'trade' || message.type === 'sellAll';
  const storing =
    message.type === 'storeItem' ||
    message.type === 'renameStorage' ||
    message.type === 'moveStorageItem';

  const player = world?.players.get(session.id);

  if (!world || !player || !session.characterId || player.hitpoints <= 0) {
    error('Join a world with a living character first.');

    return;
  }

  const changingTactics = message.type === 'setTactics' || message.type === 'moveTacticsPriority';

  if (changingTactics && message.classId !== player.classId) {
    error('Tactics must match your current class.');

    return;
  }

  villageLife(world, now);

  if (message.type === 'improveItem' && !anvilInRange(player)) {
    error('Use the smithing anvil in the village.');

    return;
  }

  const traderId = trading
    ? (message.npcId ?? nearbyInteraction(player, false, undefined, world.npcs)?.id)
    : undefined;

  if (trading && (!traderId || !traderInRange(player, traderId, world.npcs))) {
    error('Trade near Marta the Innkeeper or Bram the Craftsman in the village.');

    return;
  }

  if (storing && (player.scene || nearbyInteraction(player)?.id !== 'storehouse')) {
    error('Use the Storehouse in the village.');

    return;
  }

  if (
    message.type === 'resetTalents' &&
    (player.scene ||
      !BULLSEYE ||
      player.classId !== message.classId ||
      forestDistance({ x: player.x, y: player.y + 15 }, BULLSEYE) >= INTERACTION_RADIUS)
  ) {
    error('Use the bullseye in the village to reset your current class talents.');

    return;
  }

  let committed = false;
  try {
    commitCharacterCommand(message, player, world, session.characterId, characters, traderId);
    committed = true;
    reply({ type: 'state', world: state(world, now, player) });
  } catch (failure) {
    error(
      !committed && failure instanceof Error
        ? failure.message
        : 'Unable to save item action. Please retry.',
    );
  }
}
