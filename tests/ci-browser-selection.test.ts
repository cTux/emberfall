import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gameCommands,
  selectBrowserTests,
  selectionForEvent,
} from '../scripts/ci-browser-tests.ts';

test('durable command changes select session and inventory checks, preserving mandatory unit coverage', () => {
  const selection = selectBrowserTests([
    'packages/server/src/commands/character.ts',
    'packages/server/src/character-commands.test.ts',
    'packages/server/README.md',
  ]);
  assert.deepEqual(selection.groups, ['inventory', 'session']);
  assert.equal(selection.ui, false);
  assert.equal(selection.full, false);
  assert.equal(gameCommands(selection).length, 2);
  assert.ok(gameCommands(selection)[0].includes('--grep'));
});

test('unmapped runtime, dependencies, workflow and selector changes require full desktop coverage', () => {
  for (const path of [
    'packages/client/src/new-feature.ts',
    'pnpm-lock.yaml',
    'packages/server/src/runtime.ts',
    'packages/client/src/parties.ts',
    'packages/client/public/service-worker.js',
    '.github/workflows/verify.yml',
    'scripts/ci-browser-tests.ts',
    'packages/client/image-optimization.test.ts',
  ]) {
    assert.equal(selectBrowserTests([path]).full, true, path);
  }

  assert.equal(selectBrowserTests([]).full, true);
});

test('multiple areas union their groups; docs and Node tests add no browser work', () => {
  assert.deepEqual(
    selectBrowserTests(['docs/development.md', 'tests/simulation.test.ts']).groups,
    [],
  );
  const selection = selectBrowserTests([
    'packages/ui/src/Button.tsx',
    'packages/client/src/rendering/paints.ts',
  ]);
  assert.deepEqual(selection.groups, ['inventory', 'rendering']);
  assert.equal(selection.ui, true);
});

test('changed browser scenarios rerun their desktop group without adding phone-only scenarios', () => {
  assert.deepEqual(selectBrowserTests(['tests/reconnect.spec.ts']).groups, ['session']);
  const command = gameCommands(selectBrowserTests(['tests/npcs.spec.ts']))[0];
  assert.ok(command.includes('--grep'));
  assert.ok(!command.at(-1)!.includes('narrow screens'));
});

test('manual release runs always select the complete desktop baseline including artwork', () => {
  const selection = selectionForEvent('workflow_dispatch', {}, () => {
    throw new Error('not needed');
  });
  assert.equal(selection.full, true);
  assert.equal(selection.ui, true);
  const commands = gameCommands(selection);
  assert.equal(commands.length, 1);
  assert.equal(
    commands[0].filter((arg) => {
      return arg.endsWith('.spec.ts');
    }).length,
    15,
  );
  assert.ok(commands[0].includes('tests/server-version.spec.ts'));
});

test('PR selection uses the merge-base range and fails closed for absent history or payloads', () => {
  const base = 'a'.repeat(40),
    head = 'b'.repeat(40);
  const event = { pull_request: { base: { sha: base }, head: { sha: head } } };
  assert.equal(
    selectionForEvent('pull_request', event, (range) => {
      assert.equal(range, `${base}...${head}`);

      return ['docs/README.md'];
    }).full,
    false,
  );
  assert.equal(
    selectionForEvent('pull_request', event, () => {
      throw new Error('missing history');
    }).full,
    true,
  );
  assert.equal(
    selectionForEvent('pull_request', {}, () => {
      return [];
    }).full,
    true,
  );
});

test('host styles include shared UI checks', () => {
  const selection = selectBrowserTests(['packages/client/src/styles/scene.scss']);
  assert.deepEqual(selection.groups, ['rendering']);
  assert.equal(selection.ui, true);
});
