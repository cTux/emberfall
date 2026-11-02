import { InvalidDialogueResponse } from './invalid-dialogue-response.ts';
import * as MODEL_LIMITS from './npc-model-limits.ts';

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
