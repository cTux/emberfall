import { test, expect } from './fixtures';
import { TRAINING_ZONES } from '../packages/core/src/index.ts';

test('N opens linked talents without blocking movement; learning equips and casts a saved ability', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Talent hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  await expect(page.getByRole('button', { name: 'Talents (N)' })).toBeVisible();
  await page.keyboard.press('n');
  const tree = page.getByRole('region', { name: 'Talents', exact: true });
  await expect(tree).toBeVisible();
  await expect(tree.locator('[data-talent-node]')).toHaveCount(57);
  await expect(tree.locator('[data-talent-map] > svg > path')).toHaveCount(56);
  expect(
    await tree
      .locator('[data-talent-node="path-0-1"]')
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(46);
  expect(
    await tree
      .locator('[data-talent-node="path-0-4"]')
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(34);
  expect(
    await tree
      .locator('[data-talent-node="center"]')
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(22);
  await expect(tree.getByRole('status')).toHaveText('0 talent points available');
  player.level = 5;
  await expect(tree.getByRole('status')).toHaveText('4 talent points available');
  const beforeX = player.x;
  await page.keyboard.down('d');
  await expect.poll(() => player.x).toBeGreaterThan(beforeX + 10);
  await page.keyboard.up('d');
  await expect(tree.getByRole('button', { name: 'Sweeping strike: Locked' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  for (const name of ['+1 power', '+10% attack speed', '+5% critical chance', 'Sweeping strike']) {
    const node = tree.getByRole('button', { name: `${name}: Available`, exact: true }).first();
    await node.click();
    await expect(
      tree.getByRole('button', { name: `${name}: Learned`, exact: true }).first(),
    ).toBeVisible();
  }
  await expect(tree.getByRole('status')).toHaveText('0 talent points available');
  const cast = page.getByRole('button', { name: 'Cast Sweeping strike (1)' });
  await expect(cast).toBeVisible();
  await page.screenshot({ path: 'test-results/talents-desktop.png' });
  await page.setViewportSize({ width: 390, height: 740 });
  await expect(tree).toBeVisible();
  const bounds = await tree.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/talents-narrow.png' });
  await page.keyboard.press('n');
  await expect(tree).toHaveCount(0);
  player.x = TRAINING_ZONES[0].x;
  player.y = TRAINING_ZONES[0].y;
  await page.keyboard.press('1');
  await expect.poll(() => player.talentCooldowns?.['talent:warrior:0'] ?? 0).toBeGreaterThan(0);
  await expect(cast).toBeDisabled();
  await page.reload();
  await expect(cast).toBeVisible();
  await page.keyboard.press('n');
  await expect(tree.getByRole('button', { name: 'Sweeping strike: Learned' })).toBeVisible();
});

test('numbered abilities snapshot the cursor while base auto-target stays enabled', async ({
  page,
  game,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'emberfall-new.preferences',
      JSON.stringify({ autoAttack: false, autoTarget: true }),
    ),
  );
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Cursor hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Talents (N)' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  const { learnTalent, starterEquipment } = await import('../packages/core/src/index.ts');
  player.classId = 'ranger';
  player.equipment = starterEquipment('ranger');
  player.level = 20;
  for (let slot = 0; slot < 4; slot++)
    for (let step = 1; step <= 4; step++) learnTalent(player, `path-${slot}-${step}`);
  player.x = TRAINING_ZONES[0].x + 70;
  player.y = TRAINING_ZONES[0].y;
  await expect(page.getByRole('button', { name: 'Cast Triple shot (1)' })).toBeVisible();
  for (let slot = 0; slot < 4; slot++) {
    await page.mouse.move(1100, 500);
    await page.keyboard.press(String(slot + 1));
    await expect
      .poll(
        () =>
          world.training!.playerShots!.filter((shot) => shot.abilityId === `talent:ranger:${slot}`)
            .length,
      )
      .toBeGreaterThan(0);
    const shots = world.training!.playerShots!.filter(
      (shot) => shot.abilityId === `talent:ranger:${slot}`,
    );
    expect(shots.every((shot) => shot.targetX! > player.x && shot.targetId === undefined)).toBe(
      true,
    );
    expect(player.autoTarget).toBe(true);
  }
});

test('expanded talent graph renders curved paths and irregular branches', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Tree explorer');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await page.getByRole('button', { name: 'Talents (N)' }).click();
  const tree = page.getByRole('region', { name: 'Talents', exact: true });
  await expect(tree.locator('[data-talent-node]')).toHaveCount(57);
  const curves = await tree
    .locator('[data-talent-map] > svg > path')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  expect(curves.every((curve) => curve?.includes(' Q '))).toBe(true);
  // Expand only the review capture so the complete scrollable graph is visible.
  await tree.evaluate((element) => {
    Object.assign((element as HTMLElement).style, {
      maxHeight: 'none',
      maxWidth: 'none',
      width: '1100px',
      position: 'fixed',
      left: '16px',
      top: '16px',
      transform: 'none',
    });
    const scroller = element.querySelector<HTMLElement>('[data-talent-scroll]')!;
    scroller.style.maxHeight = 'none';
    scroller.style.overflow = 'visible';
    scroller.parentElement!.parentElement!.style.overflow = 'visible';
    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;
    (element.querySelector('.game-window-surface') as HTMLElement).style.overflow = 'visible';
  });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await tree.locator('[data-talent-map]').screenshot({ path: 'test-results/talent-tree-full.png' });
});
