import type { CharacterStore } from '../characters.ts';
import type { AccountIdentity, AdmissionMessage } from './models.ts';

export function loadAdmissionCharacter(
  characters: Pick<CharacterStore, 'loadById' | 'load'>,
  authenticated: ReturnType<AccountIdentity>,
  message: AdmissionMessage,
) {
  return authenticated
    ? characters.loadById(authenticated.characterId)
    : message.characterToken
      ? characters.load(message.characterToken)
      : undefined;
}
