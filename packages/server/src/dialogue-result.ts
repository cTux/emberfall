export type DialogueResult =
  | { status: 'ok'; text: string }
  | { status: 'busy' }
  | { status: 'unavailable' };
