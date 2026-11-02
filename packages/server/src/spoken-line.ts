import { InvalidDialogueResponse } from './invalid-dialogue-response.ts';
import * as MODEL_LIMITS from './npc-model-limits.ts';

export function spokenLine(content: string) {
  let text = content.replace(/[\t\r\n\u2028\u2029]+/gu, ' ');

  if (/[\p{Cc}\p{Cf}]/u.test(text)) {
    throw new InvalidDialogueResponse('control_characters');
  }

  // Keep apostrophes inside words (don't, Nell’s), but remove speech quotes.
  text = text
    .replace(/["“”„«»‹›`]/gu, '')
    .replace(/(?<![\p{L}\p{N}])['‘’]|['‘’](?![\p{L}\p{N}])/gu, '')
    .replace(/ +/gu, ' ')
    .trim();

  if (!text) {
    throw new InvalidDialogueResponse('empty_text');
  }

  if (text.length > MODEL_LIMITS.MAX_DIALOGUE_SIZE) {
    throw new InvalidDialogueResponse('text_too_long');
  }

  return text;
}
