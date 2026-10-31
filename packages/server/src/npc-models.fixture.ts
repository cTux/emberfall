import { DEFAULT_NPC_MODEL } from './npc-models.ts';

export const signal = () => new AbortController().signal;

export const answer = (content = 'Welcome, traveller!') =>
  Response.json({ message: { content }, done: true });

export const defaults = { baseUrl: 'http://127.0.0.1:11434', model: DEFAULT_NPC_MODEL };
