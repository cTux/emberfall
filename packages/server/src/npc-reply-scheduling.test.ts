import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { DialogueResult } from './npc-models.ts';

import { flush, player, setup } from './npcs.fixture.ts';

test('queued player mentions revalidate participants after the delay and cancel on disposal', async () => {
  for (const action of ['scene', 'distance', 'death', 'disconnect', 'leave', 'close'] as const) {
    let calls = 0;
    const { world, life } = setup({
      generate: async () => {
        calls++;

        return { status: 'ok', text: 'Hello!' };
      },
    });
    const listener = world.players.get('p')!;
    world.players.set('observer', player('observer', 2000, 2000));
    life.hear(listener, '@Marta Hello!', 1000);
    life.tick(2999, 0);
    assert.equal(calls, 0);

    if (action === 'scene') {
      listener.scene = 'forest';
    }

    if (action === 'distance') {
      listener.x += 1000;
    }

    if (action === 'death') {
      listener.hitpoints = 0;
    }

    if (action === 'disconnect') {
      listener.reconnecting = true;
    }

    if (action === 'leave') {
      world.players.delete(listener.id);
    }

    if (action === 'close') {
      life.close();
    }

    life.tick(3000, 0);
    await flush();
    assert.equal(calls, 0, action);
    assert.equal(world.chat, undefined, action);
    life.close();
  }
});

test('busy mention replies retry promptly without losing the conversation or its limit', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;

      if (calls === 2) {
        return { status: 'busy' };
      }

      return {
        status: 'ok',
        text: calls === 1 ? '@Oswin, goblins ate the ledger.' : '@Marta, again?',
      };
    },
  });
  Object.assign(world.npcs![1], { x: 350, y: 250 });
  life.tick(10_000, 0);
  await flush();
  life.tick(12_000, 0);
  await flush();
  assert.equal(world.chat!.length, 1);
  life.tick(12_499, 0);
  assert.equal(calls, 2);
  life.tick(12_500, 0);
  await flush();
  assert.equal(world.chat![1].npcId, 'hallkeeper');
  life.close();
});

test('player mentions wait for active speech and take priority over NPC continuations', async () => {
  for (const pending of ['generation', 'continuation'] as const) {
    const contexts: { quotedSpeech?: string; character: string }[] = [];
    let finish!: (result: DialogueResult) => void;
    const { world, life } = setup({
      generate: async (context) => {
        contexts.push(JSON.parse(context));

        if (contexts.length === 1) {
          return new Promise<DialogueResult>((resolve) => {
            return (finish = resolve);
          });
        }

        return { status: 'ok', text: 'Pack a spare pair of boots.' };
      },
    });
    try {
      Object.assign(world.npcs![1], { x: 350, y: 250 });
      life.tick(10_000, 0);

      if (pending === 'continuation') {
        finish({ status: 'ok', text: '@Oswin, goblins ate the ledger.' });
        await flush();
      }

      const question = '@Marta Any forest advice?';
      life.hear(world.players.get('p')!, question, 10_100);

      if (pending === 'generation') {
        // The generation lasts beyond the player's two-second reply delay.
        life.tick(13_000, 0);
        assert.equal(contexts.length, 1, 'generation remains serialized');
        finish({ status: 'ok', text: '@Oswin, goblins ate the ledger.' });
        await flush();
      } else {
        life.tick(12_099, 0);
        assert.equal(contexts.length, 1, 'NPC banter cannot jump ahead of the player');
      }

      life.tick(13_001, 0);
      await flush();
      assert.equal(contexts.length, 2);
      assert.equal(contexts[1].quotedSpeech, question, pending);
      assert.equal(contexts[1].character, world.npcs![0].name);
      assert.equal(world.chat!.at(-1)!.text, 'Pack a spare pair of boots.');
      life.tick(16_000, 0);
      await flush();
      assert.equal(contexts.length, 2, 'superseded NPC banter does not resume');
    } finally {
      life.close();
    }
  }
});

test('a pending, generating or retrying player reply cannot be replaced by another player', async () => {
  for (const stage of ['pending', 'generating', 'retrying']) {
    const questions: string[] = [];
    let finish!: (result: DialogueResult) => void;
    const { world, life } = setup({
      generate: async (context) => {
        const question = JSON.parse(context).quotedSpeech;

        if (question) {
          questions.push(question);
        }

        if (!question || stage === 'generating') {
          return new Promise<DialogueResult>((resolve) => {
            return (finish = resolve);
          });
        }

        return { status: 'busy' };
      },
    });
    try {
      world.players.set('q', player('q'));
      life.tick(10_000, 0);
      life.hear(world.players.get('p')!, '@Marta First question?', 10_100);

      if (stage !== 'pending') {
        finish({ status: 'ok', text: 'Good morning!' });
        await flush();
        life.tick(12_100, 0);
        await flush();
      }

      life.hear(world.players.get('q')!, '@Marta Second question?', 30_000);

      if (stage !== 'retrying') {
        finish({ status: 'ok', text: 'Good morning!' });
        await flush();
      }

      life.tick(32_000, 0);
      await flush();
      assert(questions.length > 0, stage);
      assert(
        questions.every((question) => {
          return question === '@Marta First question?';
        }),
        stage,
      );
    } finally {
      life.close();
    }
  }
});

test('late answers are discarded after scene transfer, range exit or world disposal', async () => {
  for (const action of ['scene', 'distance', 'close'] as const) {
    let finish!: (result: DialogueResult) => void;
    const { world, life } = setup({
      generate: () => {
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    });
    life.tick(10_000, 0);

    if (action === 'scene') {
      world.players.get('p')!.scene = 'forest';
    }

    if (action === 'distance') {
      world.players.get('p')!.x += 1000;
    }

    if (action === 'close') {
      life.close();
    }

    finish({ status: 'ok', text: 'Too late!' });
    await flush();
    assert.equal(world.chat, undefined);
    life.close();
  }
});
