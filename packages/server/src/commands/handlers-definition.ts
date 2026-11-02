import type { CommandType } from './command-type.ts';
import type { Messages } from './messages.ts';
import type { Player, Merchant } from '@emberfall/core/contracts';
import {
  improveItem,
  learnTalent,
  equipTalent,
  resetTalents,
  tradeItem,
  transferStoredItem,
  moveStorageItem,
  sellAll,
  unequipItem,
  useBackpackItem,
} from '@emberfall/core';
import { DEFAULT_TACTICS } from '@emberfall/core/contracts';
type Handlers = {
  [K in CommandType]: (message: Messages[K], player: Player, trader: Merchant) => void;
};
export const handlers: Handlers = {
  improveItem: (message, next) => {
    return improveItem(next, message.id, message.stars, message.slot);
  },
  setTactics: (message, next) => {
    next.tactics = {
      ...DEFAULT_TACTICS,
      ...next.tactics,
      ...message.tactics,
    };
  },
  moveTacticsPriority: (message, next) => {
    next.tactics = {
      ...DEFAULT_TACTICS,
      ...next.tactics,
    };
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
      next.tactics = {
        ...next.tactics,
        [message.list]: order,
      };
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
