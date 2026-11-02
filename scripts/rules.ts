import type { Group } from './group.ts';

export const rules: [RegExp, (Group | 'ui')[]][] = [
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
