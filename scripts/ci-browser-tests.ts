import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const browserGroups = {
  session: { files: ['tests/reconnect.spec.ts'] },
  inventory: {
    files: ['tests/equipment.spec.ts', 'tests/trade-quantity.spec.ts'],
    grep: '^(?:.* )?(?:inventory tabs preserve the bag, aligned square gear and calculated stat totals|trade modifiers apply to buying, selling, buyback, keyboard and vendor drops)$',
  },
  combat: {
    files: ['tests/gameplay.spec.ts', 'tests/damage-flash.spec.ts', 'tests/damage-numbers.spec.ts'],
  },
  controls: { files: ['tests/ability-effects.spec.ts', 'tests/tactics.spec.ts'] },
  rendering: {
    files: [
      'tests/rendering.spec.ts',
      'tests/renderer-lifetime.spec.ts',
      'tests/day-night.spec.ts',
      'tests/generated-art.spec.ts',
      'tests/entity-layering.spec.ts',
    ],
  },
  loading: { files: ['tests/code-splitting.spec.ts'] },
  npcs: {
    files: ['tests/npcs.spec.ts'],
    grep: 'Marta walks near a player, stops for trading|LLM outage gives every villager|eight home workstations render',
  },
} as const;
type Group = keyof typeof browserGroups;
export interface BrowserSelection {
  groups: Group[];
  ui: boolean;
  full: boolean;
  reason: string;
}
// Four minutes permits the complete combat flow on slower CI desktops.
const GAME_TIMEOUT_ARGUMENT = '--timeout=240000';
const fullGroups: Group[] = ['session', 'combat', 'controls', 'rendering'];
const full = (reason: string): BrowserSelection => {
  return {
    groups: [...fullGroups],
    ui: true,
    full: true,
    reason,
  };
};

const rules: [RegExp, (Group | 'ui')[]][] = [
  [/^packages\/ui\//, ['ui', 'inventory']],
  [/^packages\/server\/src\/npc/, ['npcs']],
  [
    /^packages\/server\/src\/(commands\/character\.ts|characters\.ts|persistence\/|accounts\.ts|account-|steam\.ts|network\/|worlds\.ts)/,
    ['session', 'inventory'],
  ],
  [
    /^packages\/core\/src\/(class-combat|combat\/|simulation|talent|talents\/|training|enemies)/,
    ['combat', 'controls'],
  ],
  [/^packages\/core\/src\/(?:mods\/base\/worlds\/|definitions\/worlds\/)/, ['combat', 'rendering']],
  [/^packages\/core\/src\/(content\/|configs\/|definitions\/|mods\/)/, ['combat', 'inventory']],
  [/^packages\/common\//, ['session', 'combat']],
  [/^packages\/client\/src\/(style\.scss|styles\/|cursors)/, ['rendering', 'ui']],
  [/^packages\/client\/src\/(equipment|Storehouse|item-comparison)/, ['inventory', 'ui']],
  [/^packages\/client\/src\/(Settings|Tactics|settings-|tactics-)/, ['controls', 'ui']],
  [/^packages\/client\/src\/(Codex|codex\/)/, ['loading', 'ui']],
  [
    /^packages\/client\/src\/(Game|WorldBrowser|WorldPanels|CharacterPanels|PartyHud|SceneOverlay|game-|useGame|useWorldChat|connection)/,
    ['session', 'loading', 'ui'],
  ],
  [
    /^packages\/client\/src\/(Arena|arena-|useArenaRenderer|local-|snapshots|frame-budget)/,
    ['session', 'combat', 'rendering'],
  ],
  [
    /^packages\/client\/(src\/(?:rendering\/|effects[/.]|combat-effects\.|art[.-]|class-art\.|npc-art\.|forest[.-]|village[.-]|lighting\.|light[.-]|drawing[.-]|paint[.-]|occlusion[.-]|atmosphere\.|texture[.-]|shadow[.-]|animation\.|fog\.|portal[.-]|environment-rendering\.|player-rendering\.|talent-cast-art\.)|public\/assets\/)/,
    ['rendering'],
  ],
];

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

export function selectionForEvent(
  eventName: string,
  event: {
    pull_request?: { base: { sha: string }; head: { sha: string } };
  },
  diff: (range: string) => string[],
): BrowserSelection {
  if (eventName === 'workflow_dispatch') {
    return full('Explicit full desktop regression run');
  }

  const base = event.pull_request?.base.sha;
  const head = event.pull_request?.head.sha;

  if (
    !base ||
    !head ||
    !/^[a-f0-9]{40}$/.test(base) ||
    !/^[a-f0-9]{40}$/.test(head) ||
    /^0+$/.test(base)
  ) {
    return full('Changed commit range unavailable');
  }

  try {
    return selectBrowserTests(diff(`${base}...${head}`));
  } catch {
    return full('Changed commit range could not be read');
  }
}

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
