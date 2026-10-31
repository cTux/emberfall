import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VillageLife, type NpcWorld } from './npcs.ts';

import { OllamaNpcDialogue, DEFAULT_NPC_MODEL } from './npc-models.ts';
import { createPlayers } from './ecs/simulation.ts';

import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import { flush, player, setup } from './npcs.fixture.ts';

test('every resident sends their own personality to Ollama for greetings, player replies and NPC answers', async () => {
  const definitions = VILLAGE_DEFINITION.villagers;
  assert.equal(
    new Set(
      definitions.map((npc) => {
        return npc.personality;
      }),
    ).size,
    definitions.length,
  );
  for (const definition of definitions) {
    for (const kind of ['greeting', 'reply', 'exchange'] as const) {
      const contexts: {
        character: string;
        personality: string;
        background: unknown;
        topic?: string;
        quotedSpeech?: string;
      }[] = [];
      const request: typeof fetch = async (_url, options) => {
        const body = JSON.parse(options!.body as string);
        const context = JSON.parse(body.messages[1].content);
        contexts.push(context);
        const text =
          kind === 'exchange' && contexts.length === 1
            ? `@${definition.name.split(' ')[0]}, the goblins stole my boots.`
            : 'The goblins finally found their sole purpose.';

        return Response.json({ message: { content: text }, done: true });
      };

      const { world, life } = setup(
        new OllamaNpcDialogue(
          request,
          () => {
            return 0;
          },
          {
            baseUrl: 'http://127.0.0.1:11434',
            model: DEFAULT_NPC_MODEL,
          },
        ),
      );
      try {
        const resident = world.npcs!.find((npc) => {
          return npc.id === definition.id;
        })!;
        world.npcs!.forEach((npc, i) => {
          return Object.assign(npc, { x: 1000 + i * 500, y: 1000 });
        });
        Object.assign(resident, { x: 300, y: 250 });
        if (kind === 'exchange') {
          world.players.get('p')!.x = 4000;
          // The first resident in scheduler order speaks to the resident under test.
          const initiator = world.npcs!.find((npc) => {
            return npc.id !== resident.id;
          })!;
          Object.assign(initiator, { x: 350, y: 250 });
          world.npcs = [initiator, resident];
          life.tick(10_000, 0);
          await flush();
          life.tick(12_000, 0);
        } else if (kind === 'reply') {
          life.hear(world.players.get('p')!, `@${definition.name.split(' ')[0]} Any advice?`, 1000);
          life.tick(3000, 0);
        } else {
          life.tick(10_000, 0);
        }

        await flush();
        assert.equal(contexts.length, kind === 'exchange' ? 2 : 1);
        const context = contexts.at(-1)!;
        assert.equal(context.character, definition.name);
        assert.equal(context.personality, definition.personality);
        assert.deepEqual(context.background, definition.background);
        if (kind === 'exchange') {
          assert.equal(context.topic, contexts[0].topic);
        }

        if (kind !== 'reply') {
          assert(context.topic);
        }

        assert.equal(!!context.quotedSpeech, kind !== 'greeting');
        assert.equal(world.chat!.at(-1)!.npcId, definition.id);
      } finally {
        life.close();
      }
    }
  }
});

test('each resident rotates all personal topics and player questions take priority', async () => {
  for (const definition of VILLAGE_DEFINITION.villagers) {
    const contexts: {
      topic?: string;
      background: typeof definition.background;
      quotedSpeech?: string;
    }[] = [];
    const world: NpcWorld = { players: createPlayers() };
    world.players.set('p', player('p', definition.x, definition.y));
    const life = new VillageLife(
      world,
      {
        generate: async (context) => {
          contexts.push(JSON.parse(context));

          return { status: 'ok', text: 'There is a story behind that.' };
        },
      },
      0,
      () => {
        return 0;
      },
    );
    try {
      // Isolate this resident so cooldowns cannot select a different speaker.
      world.npcs = world.npcs!.filter((npc) => {
        return npc.id === definition.id;
      });
      const count = VILLAGE_DEFINITION.dialogueTopics.length;
      for (let index = 0; index <= count; index++) {
        life.tick(10_000 + index * 240_000, 0);
        await flush();
      }

      assert.equal(contexts.length, count + 1);
      assert.equal(
        new Set(
          contexts.slice(0, count).map((context) => {
            return context.topic;
          }),
        ).size,
        count,
      );
      assert.notEqual(contexts[count].topic, contexts[count - 1].topic);
      assert(
        contexts.every((context) => {
          return VILLAGE_DEFINITION.dialogueTopics.includes(context.topic!);
        }),
      );
      assert(
        contexts.every((context) => {
          return JSON.stringify(context.background) === JSON.stringify(definition.background);
        }),
      );

      const now = 10_001 + count * 240_000;
      life.hear(
        world.players.get('p')!,
        `@${definition.name.split(' ')[0]} What do you dream about?`,
        now,
      );
      life.tick(now + 2000, 0);
      await flush();
      assert.equal(
        contexts.at(-1)!.quotedSpeech,
        `@${definition.name.split(' ')[0]} What do you dream about?`,
      );
      assert.equal(contexts.at(-1)!.topic, undefined);
    } finally {
      life.close();
    }
  }
});
