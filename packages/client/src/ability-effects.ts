import type { Preferences } from './preferences';

export function abilityEffectOpacity(
  preferences: Pick<Preferences, 'abilityEffectTransparency' | 'hideOtherPlayerEffects'>,
  playerId: string,
  ownerId: string | undefined,
) {
  if (preferences.hideOtherPlayerEffects && ownerId !== undefined && ownerId !== playerId) {
    return 0;
  }

  return 1 - preferences.abilityEffectTransparency;
}
