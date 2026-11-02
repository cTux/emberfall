import type { BrowserSelection } from './browser-selection-contract.ts';
import { fullGroups } from './full-groups.ts';
import { browserGroups } from './browser-groups.ts';

// Four minutes permits the complete combat flow on slower CI desktops.
const GAME_TIMEOUT_ARGUMENT = '--timeout=240000';

export function gameCommands(selection: BrowserSelection): string[][] {
  if (selection.full) {
    return [
      [
        'test:browser',
        '--max-failures=1',
        GAME_TIMEOUT_ARGUMENT,
        ...fullGroups.flatMap((group) => {
          return browserGroups[group].files;
        }),
      ],
    ];
  }

  return selection.groups.map((name) => {
    const group = browserGroups[name];

    return [
      'test:browser',
      '--max-failures=1',
      GAME_TIMEOUT_ARGUMENT,
      ...group.files,
      ...('grep' in group ? ['--grep', group.grep] : []),
    ];
  });
}
