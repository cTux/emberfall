import { test, expect } from './fixtures';
import { npcDialogueState } from './npcs.fixture';

export function registerWorkstationCases() {
  test('eight home workstations render and Marta switches from work to trading and speech, then back', async ({
    page,
    game,
  }) => {
    test.setTimeout(120_000);
    npcDialogueState.response = { status: 'ok', text: 'The soup is almost ready!' };
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      return errors.push(error.message);
    });
    await page.goto('/');
    await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
    const canvas = page.locator('canvas').first();
    await expect(canvas).toHaveAttribute('data-workstations', '8');
    const world = [...game.runtime.worlds.values()].find((w) => {
      return w.players.size;
    })!;
    const player = [...world.players.values()][0];
    const marta = world.npcs!.find((n) => {
      return n.id === 'innkeeper';
    })!;
    // Let the real scheduler walk her home; minute-long timing is covered with explicit Node-test clocks.
    await expect
      .poll(
        () => {
          return marta.workstationId;
        },
        { timeout: 85_000 },
      )
      .toBe('inn-cooking');
    await expect(canvas).toHaveAttribute('data-working-npc-ids', /innkeeper/);
    await page.screenshot({ path: 'test-results/npc-workstations-overview.png' });
    Object.assign(player, { x: marta.x + 45, y: marta.y - 15 });
    await expect(canvas).not.toHaveAttribute('data-working-npcs', '0');
    await page.screenshot({ path: 'test-results/npc-workstations.png' });
    await page.keyboard.press('e');
    const trading = page.getByRole('dialog', { name: marta.name });
    await expect(trading).toBeVisible();
    await expect
      .poll(() => {
        return marta.workstationId;
      })
      .toBeUndefined();
    await expect(canvas).not.toHaveAttribute('data-working-npc-ids', /innkeeper/);
    await page.keyboard.press('Escape');
    await expect(trading).not.toBeVisible();
    await expect
      .poll(() => {
        return marta.workstationId;
      })
      .toBe('inn-cooking');
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'Chat message' }).fill('@Marta What are you cooking?');
    await page.keyboard.press('Enter');
    await expect
      .poll(() => {
        return marta.workstationId;
      })
      .toBeUndefined();
    await expect(canvas).not.toHaveAttribute('data-working-npc-ids', /innkeeper/);
    await expect(page.getByRole('log')).toContainText('The soup is almost ready!');
    await page.screenshot({ path: 'test-results/npc-work-interrupted.png' });
    await expect
      .poll(
        () => {
          return marta.workstationId;
        },
        { timeout: 15_000 },
      )
      .toBe('inn-cooking');
    await expect(canvas).toHaveAttribute('data-working-npc-ids', /innkeeper/);
    await page.screenshot({ path: 'test-results/npc-work-resumed.png' });
    expect(errors).toEqual([]);
  });
}
