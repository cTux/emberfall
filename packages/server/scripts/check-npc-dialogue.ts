import { OllamaNpcDialogue } from '../src/npc-models.ts';

// Use the production provider and validation without starting a world or opening a save.
const result = await new OllamaNpcDialogue().generate(
  JSON.stringify({ character: 'Marta', task: 'Greet a traveller in one short sentence.' }),
  new AbortController().signal,
);

if (result.status === 'ok') {
  console.info('NPC dialogue check passed: received a valid spoken line.');
} else {
  console.error('NPC dialogue check failed. See the model failure details above.');
  process.exitCode = 1;
}
