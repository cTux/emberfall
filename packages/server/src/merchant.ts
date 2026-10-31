import { freshMerchant } from '@emberfall/core';
import type { Merchant, ChatMessage } from '@emberfall/common';
import type { CharacterStore } from './characters.ts';
import { addChat } from './chat.ts';
import { RUNTIME } from '@emberfall/core/definitions/runtime';

const retryAt = new WeakMap<object, number>();

export function refreshMerchant(
  world: { id: string; merchant?: Merchant; chat?: ChatMessage[] },
  characters: Pick<CharacterStore, 'saveMerchant'>,
  now: number,
) {
  if (!world.merchant || now < (world.merchant.refreshAt ?? 0) || now < (retryAt.get(world) ?? 0)) {
    return;
  }

  const merchant = freshMerchant(now);
  merchant.buyback = world.merchant.buyback;
  merchant.craftsman.buyback = world.merchant.craftsman?.buyback ?? [];
  try {
    characters.saveMerchant(world.id, merchant);
  } catch (cause) {
    retryAt.set(world, now + RUNTIME.autosaveMs);

    throw cause;
  }

  retryAt.delete(world);
  world.merchant = merchant;
  addChat(world, 'Marta the Innkeeper has refreshed her stock.');
  addChat(world, 'Bram the Craftsman has refreshed his stock.');
}
