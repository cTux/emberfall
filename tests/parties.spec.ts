import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { LOBBY_PORTAL } from '../packages/core/src/index.ts';

test('players opt into parties with nearby E and chat, vote together, join late and leave', async ({
  page,
  browser,
  game,
}, info) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const other = await context.newPage();
  const errors: string[] = [];

  for (const p of [page, other]) {
    p.on('pageerror', (e) => {
      return errors.push(e.message);
    });
  }

  async function join(p: Page, name: string) {
    await p.goto('/');
    await p.getByLabel('Your adventurer name').fill(name);
    await p.getByRole('button', { name: /^Join Playtest Default/ }).click();
    await expect(p.getByRole('button', { name: 'Leave world' })).toBeVisible();
  }

  async function chat(p: Page, text: string) {
    await p.keyboard.press('Enter');
    const input = p.locator('.chat-input input');
    await input.fill(text);
    await input.press('Enter');
    await p.locator('canvas').click({ position: { x: 10, y: 10 } });
  }

  try {
    await join(page, 'Alpha');
    await join(other, 'Bravo');
    const world = [...game.runtime.worlds.values()].find((w) => {
      return w.players.size === 2;
    })!;
    const a = [...world.players.values()].find((p) => {
      return p.name === 'Alpha';
    })!;
    const b = [...world.players.values()].find((p) => {
      return p.name === 'Bravo';
    })!;
    expect(a.partyId).toBeUndefined();
    expect(b.partyId).toBeUndefined();
    a.x = 1800;
    a.y = 1800;
    b.x = 1830;
    b.y = 1800;
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-interaction-prompt',
      'Invite to party',
    );
    await page.keyboard.press('e');
    await expect(other.locator('canvas')).toHaveAttribute('data-interaction-prompt', 'Accept');
    await expect(other.locator('canvas')).toHaveAttribute('data-party-requests', a.id);
    await other.screenshot({ path: 'test-results/party-request-blue-outline.png' });
    await other.keyboard.press('e');
    await expect
      .poll(() => {
        return b.partyId;
      })
      .toBe(a.partyId);
    expect(a.partyId).toBeTruthy();
    expect(b.partyLeaderId).toBe(a.id);
    await expect(other.locator('.chat-system').filter({ hasText: 'accepted' })).toBeVisible();
    await expect(page.locator('.party')).toContainText('Bravo');
    await chat(other, '/leave');
    await expect
      .poll(() => {
        return b.partyId;
      })
      .toBeUndefined();
    await expect
      .poll(() => {
        return a.partyId;
      })
      .toBeUndefined();
    a.x = LOBBY_PORTAL.x;
    a.y = LOBBY_PORTAL.y - 15;
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-interaction-prompt',
      'Forest portal',
    );
    await page.keyboard.press('e');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('button', { name: "I'm ready", exact: true }).click();
    await expect
      .poll(
        () => {
          return a.scene;
        },
        { timeout: 10000 },
      )
      .toBe('forest');
    await chat(page, '/party @Bravo');
    await expect(
      other.locator('.chat-system').filter({ hasText: 'invited Bravo' }).last(),
    ).toBeVisible();
    await chat(other, '/accept @Alpha');
    await expect
      .poll(() => {
        return b.partyId;
      })
      .toBe(a.partyId);
    expect(b.scene).toBeUndefined();
    b.x = LOBBY_PORTAL.x;
    b.y = LOBBY_PORTAL.y - 15;
    await expect(other.locator('canvas')).toHaveAttribute(
      'data-interaction-prompt',
      'Forest portal',
    );
    await other.keyboard.press('e');
    await other.getByRole('button', { name: 'Join scene', exact: true }).click();
    await expect
      .poll(() => {
        return b.scene;
      })
      .toBe('forest');
    expect(b.runId).toBe(a.runId);
    const run = game.runtime.parties(world).run(b);
    await chat(page, '/leave');
    await expect
      .poll(() => {
        return a.scene;
      })
      .toBeUndefined();
    await expect
      .poll(() => {
        return b.partyId;
      })
      .toBeUndefined();
    expect(game.runtime.parties(world).run(b)).toBe(run);
    expect(b.scene).toBe('forest');
    await info.attach('party-forest', { body: await other.screenshot(), contentType: 'image/png' });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
