import type { BrowserSelection } from './browser-selection-contract.ts';
import { full } from './full.ts';
import type { Group } from './group.ts';
import { browserGroups } from './browser-groups.ts';
import { rules } from './rules.ts';

export function selectBrowserTests(paths: string[]): BrowserSelection {
  if (!paths.length) {
    return full('Changed paths unavailable');
  }

  const groups = new Set<Group>();
  let ui = false;

  for (const path of paths) {
    if (
      path.endsWith('.md') ||
      /^(docs\/|\.agents\/)/.test(path) ||
      /^(tests\/[^/]+|packages\/server\/src\/[^/]+|packages\/core\/src\/(?:utils|content)\/tests\/[^/]+)\.test\.ts$/.test(
        path,
      )
    ) {
      continue;
    }

    if (path === 'packages/server/src/runtime.ts') {
      return full('Shared runtime changes require complete desktop coverage');
    }

    const direct = Object.entries(browserGroups).find(([, group]) => {
      return (group.files as readonly string[]).includes(path);
    });
    const matched = direct
      ? [direct[0] as Group]
      : rules.find(([pattern]) => {
          return pattern.test(path);
        })?.[1];

    if (!matched) {
      return full(`Unmapped change: ${path}`);
    }

    for (const group of matched) {
      if (group === 'ui') {
        ui = true;
      } else {
        groups.add(group);
      }
    }
  }

  return { groups: [...groups].sort(), ui, full: false, reason: 'Affected desktop scenarios' };
}
