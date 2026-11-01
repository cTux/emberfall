import * as MODEL_LIMITS from './npc-model-limits.ts';
export type ValidationFailure =
  | 'missing_body'
  | 'response_too_large'
  | 'invalid_json'
  | 'incomplete'
  | 'missing_text'
  | 'empty_text'
  | 'text_too_long'
  | 'control_characters';

export class InvalidDialogueResponse extends Error {
  readonly failure: ValidationFailure;

  constructor(failure: ValidationFailure) {
    super(failure);
    this.failure = failure;
  }
}

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

export async function boundedJson(response: Response) {
  if (!response.body) {
    throw new InvalidDialogueResponse('missing_body');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      size += value.length;

      if (size > MODEL_LIMITS.MAX_DIALOGUE_SIZE) {
        throw new InvalidDialogueResponse('response_too_large');
      }

      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      message?: { content?: unknown };
      done?: boolean;
    };
  } catch {
    throw new InvalidDialogueResponse('invalid_json');
  }
}
