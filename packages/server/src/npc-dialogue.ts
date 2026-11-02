import type { DialogueResult } from './dialogue-result.ts';

export interface NpcDialogue {
  generate(context: string, signal: AbortSignal): Promise<DialogueResult>;
}
