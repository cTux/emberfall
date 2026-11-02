import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { selectionForEvent, gameCommands, type BrowserSelection } from './browser-selection.ts';
export * from './browser-selection.ts';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === 'select') {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, 'utf8'));
    const selection = selectionForEvent(process.env.GITHUB_EVENT_NAME!, event, (range) => {
      return execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', range], {
        encoding: 'utf8',
      })
        .split('\0')
        .filter(Boolean);
    });
    console.log(JSON.stringify(selection));

    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `browser=${selection.ui || selection.groups.length > 0}\nui=${selection.ui}\ngame=${selection.groups.length > 0}\n`,
      );
    }

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### Desktop browser selection\n\n${selection.reason}\n\nGame groups: ${selection.groups.join(', ') || 'none'}; shared UI: ${selection.ui}\n`,
      );
    }
  } else if (process.argv[2] === 'game') {
    const selection: BrowserSelection = JSON.parse(readFileSync(process.argv[3], 'utf8'));

    for (const args of gameCommands(selection)) {
      const result = spawnSync('pnpm', args, { stdio: 'inherit' });

      if (result.error) {
        throw result.error;
      }

      if (result.status !== 0) {
        process.exit(result.status ?? 1);
      }
    }
  } else {
    throw new Error('Use select or game <selection.json>');
  }
}
