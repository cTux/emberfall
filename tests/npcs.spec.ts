// Sample walking poses roughly one animation frame apart.
const WALK_POSE_INTERVAL_MS = 160;
import { npcDialogueState } from './npcs.fixture';
import { registerWorkstationCases } from './npc-workstations.cases';
import { test, expect } from './fixtures';
import type { DialogueResult } from '../packages/server/src/npc-models.ts';
test.use({
  npcDialogue: {
    generate: async (context) => {
      return npcDialogueState.generate?.(context) ?? npcDialogueState.response;
    },
  },
});
test.afterEach(() => {
  npcDialogueState.generate = undefined;
});

test('a player mention during an NPC greeting receives an answer in the chat log', async ({
  page,
  game,
}) => {
  let finish!: (result: DialogueResult) => void;
  const contexts: { quotedSpeech?: string }[] = [];
  npcDialogueState.generate = async (context) => {
    contexts.push(JSON.parse(context));

    if (contexts.length === 1) {
      return new Promise<DialogueResult>((resolve) => {
        return (finish = resolve);
      });
    }

    return { status: 'ok', text: 'Pack spare boots; goblins collect the left ones.' };
  };

  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((w) => {
    return w.players.size;
  })!;
  const player = [...world.players.values()][0];
  const marta = world.npcs!.find((npc) => {
    return npc.id === 'innkeeper';
  })!;
  Object.assign(player, { x: marta.x, y: marta.y });
  await expect
    .poll(
      () => {
        return contexts.length;
      },
      { timeout: 15_000 },
    )
    .toBe(1);
  // Walking before the greeting may have moved Marta away from the player.
  Object.assign(player, { x: marta.x, y: marta.y });
  const question = '@Marta Any forest advice?';
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Chat message' }).fill(question);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log')).toContainText(question);
  finish({ status: 'ok', text: '@Oswin, goblins ate the ledger.' });
  await expect(page.getByRole('log')).toContainText(
    'Marta the Innkeeper: Pack spare boots; goblins collect the left ones.',
  );
  expect(contexts[1].quotedSpeech).toBe(question);
  expect(world.chat!.at(-1)!.npcId).toBe('innkeeper');
});

test('a long NPC reply keeps its ending and remains readable while scrolling on narrow screens', async ({
  page,
  game,
}) => {
  const text =
    'The forest goblins keep borrowing my soup spoons. '.repeat(8) + 'Please bring them back!';
  npcDialogueState.response = { status: 'ok', text };
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((w) => {
    return w.players.size;
  })!;
  const player = [...world.players.values()][0];
  const marta = world.npcs!.find((npc) => {
    return npc.id === 'innkeeper';
  })!;
  Object.assign(player, { x: marta.x, y: marta.y + 30 });
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Chat message' }).fill('@Marta Hello!');
  await page.keyboard.press('Enter');
  const reply = page.getByRole('log').getByText(`${marta.name}: ${text}`, { exact: true });
  await expect(reply).toBeVisible();
  expect(marta.chat).toBe(text);
  expect(
    world.chat!.find((message) => {
      return message.npcId === marta.id;
    })?.text,
  ).toBe(text);
  const log = page.getByRole('log');
  expect(
    await reply.evaluate((element) => {
      return element.clientHeight;
    }),
  ).toBeGreaterThan(
    await log.evaluate((element) => {
      return element.clientHeight;
    }),
  );
  await log.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(reply).toBeVisible();
  await page.screenshot({ path: 'test-results/npc-full-reply-start.png' });
  await log.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(reply).toBeVisible();
  await page.screenshot({ path: 'test-results/npc-full-reply-end.png' });
});

test('Marta walks near a player, stops for trading, and resumes when the window closes', async ({
  page,
  game,
}) => {
  npcDialogueState.response = { status: 'busy' };
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.locator('canvas').first()).toHaveAttribute('data-npcs', '4');
  const world = [...game.runtime.worlds.values()].find((w) => {
    return w.players.size;
  })!;
  const player = [...world.players.values()][0];
  const marta = world.npcs!.find((npc) => {
    return npc.id === 'innkeeper';
  })!;
  Object.assign(marta, { x: 1000, y: 1000 });
  Object.assign(player, { x: 1000, y: 985 });
  await expect
    .poll(
      () => {
        return marta.moving;
      },
      { timeout: 12_000 },
    )
    .toBe(true);
  await page.keyboard.press('e');
  const trading = page.getByRole('dialog', { name: marta.name });
  await expect(trading).toBeVisible();
  await expect
    .poll(() => {
      return marta.moving;
    })
    .toBe(false);
  const stopped = { x: marta.x, y: marta.y };
  await expect(
    page.getByRole('button', { name: `Close ${marta.name}`, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trading).not.toBeVisible();
  await expect
    .poll(() => {
      return marta.moving;
    })
    .toBe(true);
  await expect
    .poll(() => {
      return Math.hypot(marta.x - stopped.x, marta.y - stopped.y);
    })
    .toBeGreaterThan(2);
});

test('LLM outage gives every villager a visible silence debuff and one red village announcement', async ({
  page,
  game,
}) => {
  npcDialogueState.response = { status: 'unavailable' };
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toHaveAttribute('data-npcs', '4');
  const world = [...game.runtime.worlds.values()].find((w) => {
    return w.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.x = 300;
  player.y = 260;
  const warning = page.getByText(
    'The villagers have been silenced. Their voices will return soon.',
    { exact: false },
  );
  await expect(warning).toBeVisible({ timeout: 18_000 });
  await expect(canvas).toHaveAttribute('data-silenced-npcs', '4');
  await expect(page.locator('.chat-danger')).toHaveCSS('color', 'rgb(255, 135, 148)');
  await page.screenshot({ path: 'test-results/npc-silence.png' });
  expect(
    world.chat!.filter((m) => {
      return m.tone === 'danger';
    }),
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('players can address Marta, see her answer, and watch her walk after leaving trading range', async ({
  page,
  game,
}) => {
  npcDialogueState.response = { status: 'ok', text: 'Welcome! Have you met our neighbours?' };
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((w) => {
    return w.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.x = 300;
  player.y = 260;
  await expect(page.locator('canvas').first()).toHaveAttribute('data-npcs', '4');
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Chat message' }).fill('@Marta Hello!');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log')).toContainText(
    'Marta the Innkeeper: Welcome! Have you met our neighbours?',
  );
  await page.screenshot({ path: 'test-results/npc-conversation.png' });
  const marta = world.npcs!.find((n) => {
    return n.id === 'innkeeper';
  })!;
  player.x = 445;
  player.y = 350;
  const start = { x: marta.x, y: marta.y };
  await expect
    .poll(
      () => {
        return Math.hypot(marta.x - start.x, marta.y - start.y);
      },
      { timeout: 12_000 },
    )
    .toBeGreaterThan(5);

  for (let frame = 0; frame < 4; frame++) {
    await page.screenshot({ path: `test-results/npc-walking-${frame}.png` });
    await page.waitForTimeout(WALK_POSE_INTERVAL_MS);
  }

  expect(errors).toEqual([]);
});

registerWorkstationCases();
