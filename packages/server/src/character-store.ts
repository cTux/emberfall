import { characterPersistence } from './character-persistence.ts';

export const CharacterStore = characterPersistence.CharacterStore;

export type CharacterStore = InstanceType<typeof CharacterStore>;
