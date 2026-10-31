import type { DialogueResult } from '../packages/server/src/npc-models.ts';
export const npcDialogueState: {
  response: DialogueResult;
  generate?: (context: string) => Promise<DialogueResult>;
} = { response: { status: 'unavailable' } };
