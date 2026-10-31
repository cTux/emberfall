import {
  BULLSEYE,
  forestDistance,
  INTERACTION_RADIUS,
  nearbyInteraction,
  traderInRange,
  learnTalent,
  equipTalent,
  resetTalents,
  clearTalentEffects,
  useBackpackItem,
  unequipItem,
  tradeItem,
  sellAll,
  transferStoredItem,
  moveStorageItem,
} from '@emberfall/core';
import type { CommandContext, Snapshot } from '../runtime/models.ts';
import type { WorldMembership } from '../runtime/world-membership.ts';
import { DEFAULT_TACTICS, type ClientMessage, type Player, type Merchant } from '@emberfall/common';
import type { CharacterStore } from '../characters.ts';

type CommandType =
  | 'setTactics'
  | 'moveTacticsPriority'
  | 'learnTalent'
  | 'equipTalent'
  | 'resetTalents'
  | 'useItem'
  | 'unequip'
  | 'trade'
  | 'sellAll'
  | 'storeItem'
  | 'renameStorage'
  | 'moveStorageItem';
type Messages = { [K in CommandType]: Extract<ClientMessage, { type: K }> };
type Handlers = {
  [K in CommandType]: (message: Messages[K], player: Player, trader: Merchant) => void;
};

const handlers: Handlers = {
  setTactics: (message, next) => {
    next.tactics = { ...DEFAULT_TACTICS, ...next.tactics, ...message.tactics };
  },
  moveTacticsPriority: (message, next) => {
    next.tactics = { ...DEFAULT_TACTICS, ...next.tactics };
    const order = [...next.tactics[message.list]];
    const from = order.findIndex((rule) => {
      return rule === message.rule;
    });

    if (from < 0) {
      throw new Error('Priority does not belong to this list.');
    }

    const to = from + message.direction;

    if (to >= 0 && to < order.length) {
      [order[from], order[to]] = [order[to], order[from]];
      next.tactics = { ...next.tactics, [message.list]: order };
    }
  },
  learnTalent: (message, next) => {
    return learnTalent(next, message.nodeId);
  },
  equipTalent: (message, next) => {
    return equipTalent(next, message.slot, message.nodeId);
  },
  resetTalents: (_message, next) => {
    return resetTalents(next);
  },
  trade: (message, next, trader) => {
    return tradeItem(next, trader, message.id, message.buying, message.amount);
  },
  storeItem: (message, next) => {
    return transferStoredItem(next, message.tab, message.id, message.depositing);
  },
  moveStorageItem: (message, next) => {
    return moveStorageItem(next, message.fromTab, message.toTab, message.id);
  },
  renameStorage: (message, next) => {
    next.storages![message.tab].name = message.name;
  },
  sellAll: (_message, next, trader) => {
    return sellAll(next, trader);
  },
  unequip: (message, next) => {
    return unequipItem(next, message.slot);
  },
  useItem: (message, next) => {
    return useBackpackItem(next, message.id);
  },
};

export function isCharacterCommand(message: ClientMessage): message is Messages[CommandType] {
  return Object.hasOwn(handlers, message.type);
}

export function commitCharacterCommand<K extends CommandType>(
  message: Messages[K] & { type: K },
  player: Player,
  world: { id: string; merchant?: Merchant },
  characterId: string,
  characters: Pick<CharacterStore, 'merchant' | 'save'>,
  traderId?: string,
) {
  const trading = message.type === 'trade' || message.type === 'sellAll';
  let saving = false;
  try {
    const next = structuredClone(player);
    const merchant = structuredClone((world.merchant ??= characters.merchant(world.id)));
    const trader = traderId === 'craftsman' ? merchant.craftsman! : merchant;
    handlers[message.type](message, next, trader);
    saving = true;
    characters.save(
      characterId,
      next.name,
      next,
      trading ? { worldId: world.id, state: merchant } : undefined,
    );
    Object.assign(player, {
      tactics: next.tactics,
      talents: next.talents,
      talentSlots: next.talentSlots,
      talentVersion: next.talentVersion,
      backpack: next.backpack,
      storages: next.storages,
      equipment: next.equipment,
      equipmentItems: next.equipmentItems,
      coins: next.coins,
      hitpoints: next.hitpoints,
      maxHitpoints: next.maxHitpoints,
    });

    if (message.type === 'setTactics' || message.type === 'moveTacticsPriority') {
      player.attackTargetId = undefined;
    }

    if (message.type === 'resetTalents') {
      clearTalentEffects(player);
    }

    if (trading) {
      world.merchant = merchant;
    }
  } catch (failure) {
    throw new Error(
      !saving && failure instanceof Error
        ? failure.message
        : 'Unable to save item action. Please retry.',
    );
  }
}

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
