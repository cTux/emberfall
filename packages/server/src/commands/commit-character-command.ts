import type { CommandType } from './command-type.ts';
import type { Messages } from './messages.ts';
import { handlers } from './handlers-definition.ts';
import type { Player, Merchant } from '@emberfall/core/contracts';
import type { CharacterStore } from '../characters.ts';
import { recordCombatTotal, clearTalentEffects } from '@emberfall/core';

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

    // Detached item actions must credit healing only after the save succeeds.
    if (message.type === 'useItem') {
      recordCombatTotal(player, 'healingMeter', next.hitpoints - player.hitpoints, Date.now());
    }

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
